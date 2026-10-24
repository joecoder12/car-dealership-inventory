import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/app.js';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';
import { createVehicle, signedInAs } from '../helpers/factories.js';

const db = createTestDatabase();
const app = buildTestApp(db);

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

const stockOf = async (id: string) =>
  (await db.vehicle.findUniqueOrThrow({ where: { id } })).quantity;

const restock = (vehicleId: string, auth: Record<string, string>, body: object) =>
  request(app).post(`/api/vehicles/${vehicleId}/restock`).set(auth).send(body);

describe('POST /api/vehicles/:id/restock', () => {
  it('lets an admin add stock and returns the updated vehicle', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db, { quantity: 2 });

    const response = await restock(vehicle.id, admin.auth, { quantity: 5 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: vehicle.id, quantity: 7 });
    expect(await stockOf(vehicle.id)).toBe(7);
  });

  it('makes a sold-out vehicle purchasable again', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const buyer = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 0 });

    const before = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`).set(buyer.auth);
    await restock(vehicle.id, admin.auth, { quantity: 1 }).expect(200);
    const after = await request(app).post(`/api/vehicles/${vehicle.id}/purchase`).set(buyer.auth);

    expect(before.status).toBe(409);
    expect(after.status).toBe(201);
  });

  it('is restricted to admins', async () => {
    const user = await signedInAs(app, db);
    const vehicle = await createVehicle(db, { quantity: 2 });

    const anonymous = await request(app)
      .post(`/api/vehicles/${vehicle.id}/restock`)
      .send({ quantity: 5 });
    const customer = await restock(vehicle.id, user.auth, { quantity: 5 });

    expect(anonymous.status).toBe(401);
    expect(customer.status).toBe(403);
    expect(await stockOf(vehicle.id)).toBe(2);
  });

  it.each([{}, { quantity: 0 }, { quantity: -3 }, { quantity: 2.5 }, { quantity: 1001 }])(
    'rejects an invalid restock amount (%j)',
    async (body) => {
      const admin = await signedInAs(app, db, 'ADMIN');
      const vehicle = await createVehicle(db, { quantity: 2 });

      const response = await restock(vehicle.id, admin.auth, body);

      expect(response.status).toBe(400);
      expect(response.body.error.details[0].path).toBe('quantity');
      expect(await stockOf(vehicle.id)).toBe(2);
    },
  );

  it('refuses to exceed the per-vehicle stock ceiling', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db, { quantity: 9_999 });

    const response = await restock(vehicle.id, admin.auth, { quantity: 2 });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('STOCK_LIMIT_EXCEEDED');
    expect(await stockOf(vehicle.id)).toBe(9_999);
  });

  it('returns 404 for an unknown vehicle', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');

    const response = await restock(crypto.randomUUID(), admin.auth, { quantity: 1 });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND');
  });

  it('applies concurrent restocks without losing any update', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db, { quantity: 0 });

    await Promise.all(
      Array.from({ length: 10 }, () => restock(vehicle.id, admin.auth, { quantity: 1 })),
    );

    expect(await stockOf(vehicle.id)).toBe(10);
  });
});

describe('GET /api/inventory/summary', () => {
  it('gives admins stock statistics across the catalogue', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    await createVehicle(db, { price: '10000.00', quantity: 0 });
    await createVehicle(db, { price: '20000.00', quantity: 2 });
    await createVehicle(db, { price: '30000.50', quantity: 10 });

    const response = await request(app).get('/api/inventory/summary').set(admin.auth);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      vehicleCount: 3,
      totalUnits: 12,
      outOfStockCount: 1,
      lowStockCount: 1,
      lowStockThreshold: 3,
      inventoryValue: 340005,
    });
  });

  it('reports zeros for an empty catalogue', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');

    const response = await request(app).get('/api/inventory/summary').set(admin.auth);

    expect(response.body.data).toMatchObject({ vehicleCount: 0, totalUnits: 0, inventoryValue: 0 });
  });

  it('is restricted to admins', async () => {
    const user = await signedInAs(app, db);

    const response = await request(app).get('/api/inventory/summary').set(user.auth);

    expect(response.status).toBe(403);
  });
});
