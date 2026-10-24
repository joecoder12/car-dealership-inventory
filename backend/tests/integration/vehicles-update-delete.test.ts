import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/app.js';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';
import { createUser, createVehicle, signedInAs } from '../helpers/factories.js';

const db = createTestDatabase();
const app = buildTestApp(db);

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

const replacement = {
  make: 'Toyota',
  model: 'Corolla Cross',
  category: 'SUV',
  price: 27450.5,
  year: 2025,
  fuelType: 'HYBRID',
  description: 'Compact hybrid crossover.',
  imageUrl: 'https://images.example.com/corolla-cross.jpg',
};

describe('PUT /api/vehicles/:id', () => {
  it('lets an admin replace a vehicle’s details', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db, { quantity: 4 });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set(admin.auth)
      .send(replacement);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: vehicle.id, ...replacement, quantity: 4 });
    expect(new Date(response.body.data.updatedAt).getTime()).toBeGreaterThan(
      vehicle.updatedAt.getTime(),
    );
    const stored = await db.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } });
    expect(stored.model).toBe('Corolla Cross');
    expect(stored.price.toFixed(2)).toBe('27450.50');
  });

  it('clears optional attributes that are omitted (full replacement)', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db, { year: 2024, description: 'Old text' });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set(admin.auth)
      .send({ make: 'Toyota', model: 'Corolla', category: 'SEDAN', price: 21000 });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ year: null, description: null, fuelType: null });
  });

  it('refuses to set stock directly, pointing to the inventory endpoints', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db, { quantity: 4 });

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set(admin.auth)
      .send({ ...replacement, quantity: 99 });

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual([
      { path: 'quantity', message: expect.stringMatching(/restock/i) },
    ]);
    const stored = await db.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } });
    expect(stored.quantity).toBe(4);
    expect(stored.model).toBe('Corolla');
  });

  it('validates the replacement details', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db);

    const response = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set(admin.auth)
      .send({ ...replacement, price: -1, make: '' });

    expect(response.status).toBe(400);
    expect(response.body.error.details.map((d: { path: string }) => d.path).sort()).toEqual([
      'make',
      'price',
    ]);
  });

  it('returns 404 for an unknown vehicle and 400 for a malformed id', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');

    const unknown = await request(app)
      .put(`/api/vehicles/${crypto.randomUUID()}`)
      .set(admin.auth)
      .send(replacement);
    const malformed = await request(app)
      .put('/api/vehicles/not-a-uuid')
      .set(admin.auth)
      .send(replacement);

    expect(unknown.status).toBe(404);
    expect(unknown.body.error.code).toBe('VEHICLE_NOT_FOUND');
    expect(malformed.status).toBe(400);
  });

  it('is restricted to admins', async () => {
    const user = await signedInAs(app, db, 'USER');
    const vehicle = await createVehicle(db);

    const anonymous = await request(app).put(`/api/vehicles/${vehicle.id}`).send(replacement);
    const customer = await request(app)
      .put(`/api/vehicles/${vehicle.id}`)
      .set(user.auth)
      .send(replacement);

    expect(anonymous.status).toBe(401);
    expect(customer.status).toBe(403);
    expect((await db.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } })).model).toBe(
      'Corolla',
    );
  });
});

describe('DELETE /api/vehicles/:id', () => {
  it('lets an admin delete a vehicle', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db);

    const response = await request(app).delete(`/api/vehicles/${vehicle.id}`).set(admin.auth);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(await db.vehicle.findUnique({ where: { id: vehicle.id } })).toBeNull();
  });

  it('returns 404 when the vehicle does not exist (e.g. already deleted)', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const vehicle = await createVehicle(db);
    await request(app).delete(`/api/vehicles/${vehicle.id}`).set(admin.auth);

    const again = await request(app).delete(`/api/vehicles/${vehicle.id}`).set(admin.auth);

    expect(again.status).toBe(404);
    expect(again.body.error.code).toBe('VEHICLE_NOT_FOUND');
  });

  it('is restricted to admins', async () => {
    const user = await signedInAs(app, db, 'USER');
    const vehicle = await createVehicle(db);

    const anonymous = await request(app).delete(`/api/vehicles/${vehicle.id}`);
    const customer = await request(app).delete(`/api/vehicles/${vehicle.id}`).set(user.auth);

    expect(anonymous.status).toBe(401);
    expect(customer.status).toBe(403);
    expect(await db.vehicle.count()).toBe(1);
  });

  it('keeps purchase history when a sold vehicle is deleted', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const buyer = await createUser(db);
    const vehicle = await createVehicle(db);
    const purchase = await db.purchase.create({
      data: {
        userId: buyer.id,
        vehicleId: vehicle.id,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        quantity: 1,
        unitPrice: vehicle.price,
        totalPrice: vehicle.price,
      },
    });

    await request(app).delete(`/api/vehicles/${vehicle.id}`).set(admin.auth).expect(204);

    const record = await db.purchase.findUniqueOrThrow({ where: { id: purchase.id } });
    expect(record.vehicleId).toBeNull();
    expect(record.vehicleModel).toBe('Corolla');
  });
});
