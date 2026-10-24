import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp } from '../helpers/app.js';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';
import { createVehicle } from '../helpers/factories.js';

const db = createTestDatabase();
const app = buildTestApp(db);

// Listed oldest → newest; explicit createdAt makes "newest first" deterministic.
const fleet = [
  { make: 'Toyota', model: 'Camry', category: 'SEDAN', price: '28999.00', quantity: 4, year: 2024 },
  { make: 'Toyota', model: 'RAV4', category: 'SUV', price: '33500.00', quantity: 0, year: 2025 },
  { make: 'Honda', model: 'Civic', category: 'SEDAN', price: '24500.00', quantity: 7, year: 2023 },
  { make: 'Ford', model: 'F-150', category: 'TRUCK', price: '45500.00', quantity: 3, year: 2024 },
  { make: 'Tesla', model: 'Model 3', category: 'SEDAN', price: '42990.00', quantity: 2, year: 2025 },
  { make: 'BMW', model: 'X5', category: 'SUV', price: '65900.00', quantity: 1, year: 2025 },
] as const;

beforeEach(async () => {
  await resetDatabase(db);
  for (const [index, vehicle] of fleet.entries()) {
    await createVehicle(db, { ...vehicle, createdAt: new Date(Date.UTC(2026, 0, index + 1)) });
  }
});
afterAll(() => db.$disconnect());

const models = (response: request.Response): string[] =>
  response.body.data.map((vehicle: { model: string }) => vehicle.model);

describe('GET /api/vehicles', () => {
  it('lists every vehicle, newest first, including out-of-stock ones', async () => {
    const response = await request(app).get('/api/vehicles');

    expect(response.status).toBe(200);
    expect(models(response)).toEqual(['X5', 'Model 3', 'F-150', 'Civic', 'RAV4', 'Camry']);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 12, total: 6, totalPages: 1 });
  });

  it('paginates without overlap', async () => {
    const first = await request(app).get('/api/vehicles?pageSize=4&page=1');
    const second = await request(app).get('/api/vehicles?pageSize=4&page=2');

    expect(models(first)).toEqual(['X5', 'Model 3', 'F-150', 'Civic']);
    expect(models(second)).toEqual(['RAV4', 'Camry']);
    expect(second.body.meta).toEqual({ page: 2, pageSize: 4, total: 6, totalPages: 2 });
  });

  it('returns an empty page past the end rather than an error', async () => {
    const response = await request(app).get('/api/vehicles?page=9');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.meta.total).toBe(6);
  });

  it('supports sorting', async () => {
    const response = await request(app).get('/api/vehicles?sort=price_asc');

    expect(models(response)).toEqual(['Civic', 'Camry', 'RAV4', 'Model 3', 'F-150', 'X5']);
  });

  it.each(['page=0', 'page=-1', 'pageSize=0', 'pageSize=51', 'pageSize=abc', 'sort=cheapest'])(
    'rejects invalid pagination or sorting (%s)',
    async (query) => {
      const response = await request(app).get(`/api/vehicles?${query}`);

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    },
  );

  it('returns an empty list with zero pages when the catalogue is empty', async () => {
    await resetDatabase(db);

    const response = await request(app).get('/api/vehicles');

    expect(response.body).toEqual({
      data: [],
      meta: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
    });
  });
});

describe('GET /api/vehicles/search', () => {
  it('matches make case-insensitively and partially', async () => {
    const response = await request(app).get('/api/vehicles/search?make=toY');

    expect(response.status).toBe(200);
    expect(models(response).sort()).toEqual(['Camry', 'RAV4']);
  });

  it('matches model', async () => {
    const response = await request(app).get('/api/vehicles/search?model=model');

    expect(models(response)).toEqual(['Model 3']);
  });

  it('filters by category', async () => {
    const response = await request(app).get('/api/vehicles/search?category=SUV');

    expect(models(response).sort()).toEqual(['RAV4', 'X5']);
  });

  it('filters by an inclusive price range', async () => {
    const response = await request(app).get(
      '/api/vehicles/search?minPrice=24500&maxPrice=28999&sort=price_asc',
    );

    expect(models(response)).toEqual(['Civic', 'Camry']);
  });

  it('supports a one-sided price bound', async () => {
    const response = await request(app).get('/api/vehicles/search?minPrice=45000');

    expect(models(response).sort()).toEqual(['F-150', 'X5']);
  });

  it('free-text query matches every word against make or model', async () => {
    const both = await request(app).get('/api/vehicles/search?q=toyota%20cam');
    const single = await request(app).get('/api/vehicles/search?q=CIVIC');

    expect(models(both)).toEqual(['Camry']);
    expect(models(single)).toEqual(['Civic']);
  });

  it('can restrict results to vehicles in stock', async () => {
    const response = await request(app).get('/api/vehicles/search?make=toyota&inStock=true');

    expect(models(response)).toEqual(['Camry']);
  });

  it('combines filters, sorting and pagination with a filtered total', async () => {
    const response = await request(app).get(
      '/api/vehicles/search?category=SEDAN&sort=price_desc&pageSize=2',
    );

    expect(models(response)).toEqual(['Model 3', 'Camry']);
    expect(response.body.meta).toEqual({ page: 1, pageSize: 2, total: 3, totalPages: 2 });
  });

  it('sorts alphabetically by make then model', async () => {
    const response = await request(app).get('/api/vehicles/search?sort=make_asc');

    expect(models(response)).toEqual(['X5', 'F-150', 'Civic', 'Model 3', 'Camry', 'RAV4']);
  });

  it('sorts by model year, newest first', async () => {
    const response = await request(app).get('/api/vehicles/search?sort=year_desc&pageSize=3');

    expect(response.body.data.every((v: { year: number }) => v.year === 2025)).toBe(true);
  });

  it('ignores empty parameters, as sent by a blank search form', async () => {
    const response = await request(app).get('/api/vehicles/search?q=&make=&category=&minPrice=');

    expect(response.status).toBe(200);
    expect(response.body.meta.total).toBe(6);
  });

  it.each([
    ['category=SPACESHIP', 'category'],
    ['minPrice=-1', 'minPrice'],
    ['minPrice=50000&maxPrice=1000', 'maxPrice'],
    ['maxPrice=abc', 'maxPrice'],
    ['inStock=maybe', 'inStock'],
  ])('rejects invalid filters (%s)', async (query, path) => {
    const response = await request(app).get(`/api/vehicles/search?${query}`);

    expect(response.status).toBe(400);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path })]),
    );
  });

  it('treats user input as literal text, not SQL or LIKE wildcards', async () => {
    for (const q of ["' OR 1=1 --", '%', '_', 'Camry%']) {
      const response = await request(app).get(
        `/api/vehicles/search?q=${encodeURIComponent(q)}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    }
  });
});
