import request from 'supertest';
import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, createSilentLogger } from '../helpers/app.js';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';
import { createUser, createVehicle, login, signedInAs } from '../helpers/factories.js';

const db = createTestDatabase();
const logger = createSilentLogger();
const app = buildTestApp(db, { logger });

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

const stockOf = async (id: string) =>
  (await db.vehicle.findUniqueOrThrow({ where: { id } })).quantity;

const purchase = (vehicleId: string, auth: Record<string, string>, body?: object) => {
  const req = request(app).post(`/api/vehicles/${vehicleId}/purchase`).set(auth);
  return body === undefined ? req : req.send(body);
};

describe('POST /api/vehicles/:id/purchase', () => {
  it('sells one unit by default and records the purchase', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { price: '30500.00', quantity: 5 });

    const response = await purchase(vehicle.id, buyer.auth);

    expect(response.status).toBe(201);
    expect(response.body.data.purchase).toEqual({
      id: expect.any(String),
      vehicleId: vehicle.id,
      vehicleMake: 'Toyota',
      vehicleModel: 'Corolla',
      quantity: 1,
      unitPrice: 30500,
      totalPrice: 30500,
      createdAt: expect.any(String),
    });
    expect(response.body.data.vehicle).toMatchObject({ id: vehicle.id, quantity: 4 });
    expect(await stockOf(vehicle.id)).toBe(4);
    const record = await db.purchase.findUniqueOrThrow({
      where: { id: response.body.data.purchase.id },
    });
    expect(record.userId).toBe(buyer.user.id);
  });

  it('sells several units and prices the total exactly', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { price: '19999.99', quantity: 5 });

    const response = await purchase(vehicle.id, buyer.auth, { quantity: 3 });

    expect(response.status).toBe(201);
    expect(response.body.data.purchase).toMatchObject({ quantity: 3, totalPrice: 59999.97 });
    expect(await stockOf(vehicle.id)).toBe(2);
  });

  it('can sell the very last unit', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 1 });

    const response = await purchase(vehicle.id, buyer.auth);

    expect(response.status).toBe(201);
    expect(response.body.data.vehicle.quantity).toBe(0);
  });

  it('requires authentication', async () => {
    const vehicle = await createVehicle(db, { quantity: 5 });

    const response = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`);

    expect(response.status).toBe(401);
    expect(await stockOf(vehicle.id)).toBe(5);
  });

  it('refuses to sell an out-of-stock vehicle and changes nothing', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 0 });

    const response = await purchase(vehicle.id, buyer.auth);

    expect(response.status).toBe(409);
    expect(response.body.error).toEqual({
      code: 'INSUFFICIENT_STOCK',
      message: 'Only 0 unit(s) in stock; cannot purchase 1',
    });
    expect(await stockOf(vehicle.id)).toBe(0);
    expect(await db.purchase.count()).toBe(0);
  });

  it('refuses to sell more units than are in stock', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 2 });

    const response = await purchase(vehicle.id, buyer.auth, { quantity: 3 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(await stockOf(vehicle.id)).toBe(2);
  });

  it.each([0, -1, 1.5, '2', 6, null])('rejects an invalid quantity (%j)', async (quantity) => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 10 });

    const response = await purchase(vehicle.id, buyer.auth, { quantity });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].path).toBe('quantity');
    expect(await stockOf(vehicle.id)).toBe(10);
  });

  it('returns 404 for an unknown vehicle and 400 for a malformed id', async () => {
    const buyer = await signedInAs(app, db);

    const unknown = await purchase(crypto.randomUUID(), buyer.auth);
    const malformed = await purchase('abc', buyer.auth);

    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('VEHICLE_NOT_FOUND');
    expect(malformed.status).toBe(400);
  });

  it('requires the CSRF header when the browser session cookie is used', async () => {
    const user = await createUser(db);
    const session = await login(app, user.email);
    const vehicle = await createVehicle(db, { quantity: 3 });

    const withoutHeader = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Cookie', session.cookies);
    const withHeader = await request(app)
      .post(`/api/vehicles/${vehicle.id}/purchase`)
      .set('Cookie', session.cookies)
      .set('X-CSRF-Token', session.csrfToken);

    expect(withoutHeader.status).toBe(403);
    expect(withHeader.status).toBe(201);
    expect(await stockOf(vehicle.id)).toBe(2);
  });
});

describe('purchase concurrency', () => {
  it('never oversells when many buyers race for limited stock', async () => {
    const vehicle = await createVehicle(db, { quantity: 5 });
    const buyers = await Promise.all(Array.from({ length: 4 }, () => signedInAs(app, db)));

    // 20 simultaneous single-unit purchases for 5 units.
    const responses = await Promise.all(
      Array.from({ length: 20 }, (_, i) => purchase(vehicle.id, buyers[i % 4]!.auth)),
    );

    const statuses = responses.map((response) => response.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(5);
    expect(statuses.filter((status) => status === 409)).toHaveLength(15);
    expect(await stockOf(vehicle.id)).toBe(0);
    expect(await db.purchase.count()).toBe(5);
  });

  it('never goes negative with competing multi-unit purchases', async () => {
    const vehicle = await createVehicle(db, { quantity: 5 });
    const buyer = await signedInAs(app, db);

    const responses = await Promise.all(
      Array.from({ length: 3 }, () => purchase(vehicle.id, buyer.auth, { quantity: 2 })),
    );

    expect(responses.filter((response) => response.status === 201)).toHaveLength(2);
    expect(await stockOf(vehicle.id)).toBe(1);
    const sold = await db.purchase.aggregate({ _sum: { quantity: true } });
    expect(sold._sum.quantity).toBe(4);
  });
});

describe('idempotent purchases (Idempotency-Key header)', () => {
  it('replays the original result instead of buying twice', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 5 });
    const headers = { ...buyer.auth, 'Idempotency-Key': 'order-7f3a9c21' };

    const first = await purchase(vehicle.id, headers);
    const retry = await purchase(vehicle.id, headers);

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.headers['idempotent-replayed']).toBe('true');
    expect(retry.body.data.purchase.id).toBe(first.body.data.purchase.id);
    expect(await stockOf(vehicle.id)).toBe(4);
    expect(await db.purchase.count()).toBe(1);
  });

  it('buys only once when the same request is fired concurrently', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 1 });
    const headers = { ...buyer.auth, 'Idempotency-Key': 'double-click-0001' };

    const responses = await Promise.all(
      Array.from({ length: 5 }, () => purchase(vehicle.id, headers)),
    );

    const purchaseIds = new Set(responses.map((response) => response.body.data?.purchase?.id));
    expect(responses.every((response) => [200, 201].includes(response.status))).toBe(true);
    expect(purchaseIds.size).toBe(1);
    expect(await stockOf(vehicle.id)).toBe(0);
    expect(await db.purchase.count()).toBe(1);
  });

  it('scopes keys to the user, so two buyers may use the same key', async () => {
    const [alice, bob] = await Promise.all([signedInAs(app, db), signedInAs(app, db)]);
    const vehicle = await createVehicle(db, { quantity: 5 });

    const a = await purchase(vehicle.id, { ...alice.auth, 'Idempotency-Key': 'shared-key-123' });
    const b = await purchase(vehicle.id, { ...bob.auth, 'Idempotency-Key': 'shared-key-123' });

    expect([a.status, b.status]).toEqual([201, 201]);
    expect(await stockOf(vehicle.id)).toBe(3);
  });

  it('rejects reusing a key for a different purchase', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 5 });
    const headers = { ...buyer.auth, 'Idempotency-Key': 'order-reused-01' };

    await purchase(vehicle.id, headers, { quantity: 1 });
    const different = await purchase(vehicle.id, headers, { quantity: 2 });

    expect(different.status).toBe(422);
    expect(different.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await stockOf(vehicle.id)).toBe(4);
  });

  it('validates the key format', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 5 });

    const response = await purchase(vehicle.id, { ...buyer.auth, 'Idempotency-Key': 'bad key!' });

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].path).toBe('Idempotency-Key');
  });
});

describe('purchase failure atomicity', () => {
  // A real PostgreSQL trigger makes the purchase INSERT fail *after* the stock
  // decrement has run inside the same transaction.
  beforeEach(async () => {
    await db.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION fail_purchase_insert() RETURNS trigger AS $$
      BEGIN RAISE EXCEPTION 'simulated storage failure'; END;
      $$ LANGUAGE plpgsql`);
    await db.$executeRawUnsafe(`
      CREATE TRIGGER fail_purchase_insert BEFORE INSERT ON purchases
      FOR EACH ROW WHEN (NEW.vehicle_model = 'Unlucky') EXECUTE FUNCTION fail_purchase_insert()`);
  });
  afterEach(async () => {
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS fail_purchase_insert ON purchases');
  });

  it('rolls back the stock decrement when recording the purchase fails', async () => {
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { model: 'Unlucky', quantity: 3 });

    const response = await purchase(vehicle.id, buyer.auth);

    expect(response.status).toBe(500);
    expect(response.body.error).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(response.body)).not.toContain('simulated storage failure');
    expect(await stockOf(vehicle.id)).toBe(3);
    expect(await db.purchase.count()).toBe(0);
    expect(logger.errors.length).toBeGreaterThan(0);
  });
});
