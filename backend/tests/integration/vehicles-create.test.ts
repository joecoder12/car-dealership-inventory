import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/app.js';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';
import { createUser, createVehicle, login, signedInAs } from '../helpers/factories.js';

const db = createTestDatabase();
const app = buildTestApp(db);

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

const newVehicle = {
  make: 'Porsche',
  model: 'Taycan',
  category: 'SEDAN',
  price: 89999.99,
  quantity: 2,
  year: 2025,
  fuelType: 'ELECTRIC',
  description: 'Four-door electric sports saloon.',
  imageUrl: 'https://images.example.com/taycan.jpg',
};

describe('POST /api/vehicles', () => {
  it('lets an admin add a vehicle and persists it', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');

    const response = await request(app).post('/api/vehicles').set(admin.auth).send(newVehicle);

    expect(response.status).toBe(201);
    expect(response.body.data).toEqual({
      ...newVehicle,
      id: expect.any(String),
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    const stored = await db.vehicle.findUniqueOrThrow({ where: { id: response.body.data.id } });
    expect(stored.price.toFixed(2)).toBe('89999.99');
    expect(stored.quantity).toBe(2);
  });

  it('defaults optional attributes to null and trims text', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');

    const response = await request(app)
      .post('/api/vehicles')
      .set(admin.auth)
      .send({ make: '  Ford ', model: ' F-150 ', category: 'TRUCK', price: 45500, quantity: 0 });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      make: 'Ford',
      model: 'F-150',
      price: 45500,
      quantity: 0,
      year: null,
      fuelType: null,
      description: null,
      imageUrl: null,
    });
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/vehicles').send(newVehicle);

    expect(response.status).toBe(401);
    expect(await db.vehicle.count()).toBe(0);
  });

  it('forbids non-admin users', async () => {
    const user = await signedInAs(app, db, 'USER');

    const response = await request(app).post('/api/vehicles').set(user.auth).send(newVehicle);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('FORBIDDEN');
    expect(await db.vehicle.count()).toBe(0);
  });

  it.each([
    ['make', { make: '' }],
    ['model', { model: 'x'.repeat(81) }],
    ['category', { category: 'SPACESHIP' }],
    ['price', { price: 0 }],
    ['price', { price: -10 }],
    ['price', { price: 10.999 }],
    ['price', { price: '100' }],
    ['price', { price: 100_000_000 }],
    ['quantity', { quantity: -1 }],
    ['quantity', { quantity: 1.5 }],
    ['year', { year: 1700 }],
    ['fuelType', { fuelType: 'STEAM' }],
    ['imageUrl', { imageUrl: 'javascript:alert(1)' }],
    ['imageUrl', { imageUrl: 'http://insecure.example.com/car.jpg' }],
  ])('rejects an invalid %s (%j)', async (field, override) => {
    const admin = await signedInAs(app, db, 'ADMIN');

    const response = await request(app)
      .post('/api/vehicles')
      .set(admin.auth)
      .send({ ...newVehicle, ...override });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: field })]),
    );
    expect(await db.vehicle.count()).toBe(0);
  });

  it('accepts the next model year but not one further ahead', async () => {
    const admin = await signedInAs(app, db, 'ADMIN');
    const nextYear = new Date().getFullYear() + 1;

    const ok = await request(app)
      .post('/api/vehicles')
      .set(admin.auth)
      .send({ ...newVehicle, year: nextYear });
    const tooFar = await request(app)
      .post('/api/vehicles')
      .set(admin.auth)
      .send({ ...newVehicle, year: nextYear + 1 });

    expect(ok.status).toBe(201);
    expect(tooFar.status).toBe(400);
  });
});

describe('CSRF protection for cookie sessions', () => {
  it('rejects a cookie-authenticated mutation without the X-CSRF-Token header', async () => {
    const admin = await createUser(db, { role: 'ADMIN' });
    const session = await login(app, admin.email);

    const response = await request(app)
      .post('/api/vehicles')
      .set('Cookie', session.cookies)
      .send(newVehicle);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('CSRF_TOKEN_INVALID');
    expect(await db.vehicle.count()).toBe(0);
  });

  it('rejects a header that does not match the token in the session', async () => {
    const admin = await createUser(db, { role: 'ADMIN' });
    const session = await login(app, admin.email);

    const response = await request(app)
      .post('/api/vehicles')
      .set('Cookie', session.cookies)
      .set('X-CSRF-Token', 'forged-value-forged-value-forged-value')
      .send(newVehicle);

    expect(response.status).toBe(403);
  });

  it('accepts a cookie-authenticated mutation carrying the matching header', async () => {
    const admin = await createUser(db, { role: 'ADMIN' });
    const session = await login(app, admin.email);

    const response = await request(app)
      .post('/api/vehicles')
      .set('Cookie', session.cookies)
      .set('X-CSRF-Token', session.csrfToken)
      .send(newVehicle);

    expect(response.status).toBe(201);
  });
});

describe('GET /api/vehicles/:id', () => {
  it('returns a vehicle to anyone, without authentication', async () => {
    const vehicle = await createVehicle(db, { make: 'Mazda', model: 'MX-5', price: '32500.50' });

    const response = await request(app).get(`/api/vehicles/${vehicle.id}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: vehicle.id,
      make: 'Mazda',
      model: 'MX-5',
      price: 32500.5,
      quantity: 5,
    });
  });

  it('returns 404 for an unknown id', async () => {
    const response = await request(app).get(`/api/vehicles/${crypto.randomUUID()}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('VEHICLE_NOT_FOUND');
  });

  it('returns 400 for an id that is not a UUID', async () => {
    const response = await request(app).get('/api/vehicles/123');

    expect(response.status).toBe(400);
    expect(response.body.error.details[0].path).toBe('id');
  });
});
