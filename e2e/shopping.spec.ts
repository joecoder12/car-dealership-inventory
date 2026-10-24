import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  adminApi,
  createVehicleViaApi,
  csrfHeaders,
  registerThroughUi,
  searchShowroom,
  uniqueId,
  vehicleRow,
  type ApiVehicle,
} from './support/helpers';

let api: APIRequestContext;
let available: ApiVehicle;
let soldOut: ApiVehicle;
const tag = uniqueId();

test.beforeAll(async () => {
  api = await adminApi();
  available = await createVehicleViaApi(api, {
    make: 'Aurora',
    model: `Grand Tourer ${tag}`,
    category: 'COUPE',
    price: 54990,
    quantity: 2,
  });
  soldOut = await createVehicleViaApi(api, {
    make: 'Aurora',
    model: `Sold Out Special ${tag}`,
    category: 'SUV',
    price: 61000,
    quantity: 0,
  });
});

test.afterAll(async () => {
  await api.dispose();
});

test('2. anyone can browse the live catalogue', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Find the one that moves you.' })).toBeVisible();
  const card = page.getByRole('article', { name: `Aurora Grand Tourer ${tag}` });
  await expect(card).toBeVisible();
  await expect(card.getByText('$54,990')).toBeVisible();
  await expect(card.getByText('Only 2 left')).toBeVisible();
});

test('3. search narrows the catalogue to matching vehicles', async ({ page }) => {
  await searchShowroom(page, `tourer ${tag}`);

  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article', { name: `Aurora Grand Tourer ${tag}` })).toBeVisible();

  await page.getByRole('group', { name: 'Category' }).getByRole('button', { name: 'SUV' }).click();
  await expect(page.getByRole('heading', { name: 'No vehicles match your search' })).toBeVisible();
});

test('4 + 5. a signed-in customer buys a vehicle and the stock goes down', async ({ page }) => {
  await registerThroughUi(page);
  await searchShowroom(page, tag);
  const card = page.getByRole('article', { name: `Aurora Grand Tourer ${tag}` });

  await card.getByRole('button', { name: /Purchase/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Confirm purchase' });
  await expect(dialog.getByTestId('purchase-total')).toHaveText('$54,990');
  await dialog.getByRole('button', { name: 'Confirm purchase' }).click();

  await expect(page.getByRole('status')).toContainText(
    `Purchase confirmed: 1 × Aurora Grand Tourer ${tag}. 1 left in stock.`,
  );
  await expect(card.getByText('Only 1 left')).toBeVisible();

  // Persisted, not just displayed.
  expect((await vehicleRow(available.id))?.quantity).toBe(1);
  const fromApi = await (await api.get(`/api/vehicles/${available.id}`)).json();
  expect(fromApi.data.quantity).toBe(1);
});

test('6. a sold-out vehicle cannot be purchased, in the UI or via the API', async ({ page }) => {
  await registerThroughUi(page);
  await searchShowroom(page, tag);
  const card = page.getByRole('article', { name: `Aurora Sold Out Special ${tag}` });

  await expect(card.getByText('Sold out', { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: /Purchase/ })).toBeDisabled();

  // Bypassing the disabled button does not help: the server is authoritative.
  const response = await page.request.post(`/api/vehicles/${soldOut.id}/purchase`, {
    headers: await csrfHeaders(page),
    data: { quantity: 1 },
  });
  expect(response.status()).toBe(409);
  expect((await response.json()).error.code).toBe('INSUFFICIENT_STOCK');
  expect((await vehicleRow(soldOut.id))?.quantity).toBe(0);
});
