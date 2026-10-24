import { expect, request, type APIRequestContext, type Page } from '@playwright/test';
import pg from 'pg';
import { E2E_ADMIN, E2E_API_URL } from './constants';

/** Short random suffix so every test works with its own uniquely named data. */
export const uniqueId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** An API client authenticated as the E2E admin with a Bearer token (no cookies). */
export async function adminApi(): Promise<APIRequestContext> {
  const anonymous = await request.newContext({ baseURL: E2E_API_URL });
  const response = await anonymous.post('/api/auth/login', {
    data: { email: E2E_ADMIN.email, password: E2E_ADMIN.password },
  });
  expect(response.status()).toBe(200);
  const { data } = await response.json();
  await anonymous.dispose();
  return request.newContext({
    baseURL: E2E_API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${data.token}` },
  });
}

export interface ApiVehicle {
  id: string;
  make: string;
  model: string;
  price: number;
  quantity: number;
}

export async function createVehicleViaApi(
  api: APIRequestContext,
  overrides: Partial<ApiVehicle> & Record<string, unknown> = {},
): Promise<ApiVehicle> {
  const response = await api.post('/api/vehicles', {
    data: {
      make: 'E2E Motors',
      model: `Model ${uniqueId()}`,
      category: 'SEDAN',
      price: 30000,
      quantity: 3,
      ...overrides,
    },
  });
  expect(response.status()).toBe(201);
  return (await response.json()).data;
}

/**
 * Reads straight from PostgreSQL, so tests assert on persisted state rather
 * than on what the UI or API claims.
 */
export async function vehicleRow(id: string) {
  const client = new pg.Client({
    connectionString:
      process.env.E2E_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/car_dealership_e2e',
  });
  await client.connect();
  try {
    const { rows } = await client.query<{ quantity: number; price: string; model: string }>(
      'SELECT quantity, price::text, model FROM vehicles WHERE id = $1',
      [id],
    );
    return rows[0] ?? null;
  } finally {
    await client.end();
  }
}

export async function registerThroughUi(page: Page, name = 'E2E Shopper') {
  const email = `shopper-${uniqueId()}@example.com`;
  const password = `Shopper-${uniqueId()}9`;
  await page.goto('/register');
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('button', { name: `Account menu for ${name}` })).toBeVisible();
  return { name, email, password };
}

export async function signInThroughUi(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Headers a browser-session API call needs: the CSRF token from its readable cookie. */
export async function csrfHeaders(page: Page) {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'csrf_token');
  return { 'X-CSRF-Token': cookie?.value ?? '' };
}

export async function searchShowroom(page: Page, text: string) {
  await page.goto('/');
  await page.getByRole('searchbox', { name: 'Search vehicles' }).fill(text);
  // URLSearchParams encodes spaces as '+', exactly as the app writes the URL.
  const expected = new URLSearchParams({ q: text }).toString().replace(/[+]/g, '\\+');
  await expect(page).toHaveURL(new RegExp(expected));
}
