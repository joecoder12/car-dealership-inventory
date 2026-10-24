import { expect, test, type Page } from '@playwright/test';
import { E2E_ADMIN } from './support/constants';
import {
  adminApi,
  createVehicleViaApi,
  csrfHeaders,
  registerThroughUi,
  signInThroughUi,
  uniqueId,
  vehicleRow,
} from './support/helpers';

test('7. a normal user cannot reach admin pages or admin API operations', async ({ page }) => {
  const api = await adminApi();
  const target = await createVehicleViaApi(api, { quantity: 1 });
  await api.dispose();

  await registerThroughUi(page);
  await expect(page.getByRole('link', { name: 'Manage inventory' })).toHaveCount(0);

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Admins only' })).toBeVisible();

  const headers = await csrfHeaders(page);
  const create = await page.request.post('/api/vehicles', {
    headers,
    data: { make: 'Nope', model: 'Nope', category: 'SEDAN', price: 1, quantity: 1 },
  });
  const restock = await page.request.post(`/api/vehicles/${target.id}/restock`, {
    headers,
    data: { quantity: 5 },
  });
  const remove = await page.request.delete(`/api/vehicles/${target.id}`, { headers });

  expect([create.status(), restock.status(), remove.status()]).toEqual([403, 403, 403]);
  expect((await vehicleRow(target.id))?.quantity).toBe(1);
});

test.describe.serial('8–10. an admin manages a vehicle end to end', () => {
  const model = `Electra ${uniqueId()}`;
  let vehicleId = '';

  test.beforeEach(async ({ page }) => {
    await signInThroughUi(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await expect(page.getByRole('link', { name: 'Manage inventory' })).toBeVisible();
  });

  const findRow = async (page: Page) => {
    await page.goto('/admin');
    await page.getByRole('searchbox', { name: 'Search vehicles' }).fill(model);
    const row = page.getByRole('row', { name: new RegExp(`Voltline ${model}`) });
    await expect(row).toBeVisible();
    return row;
  };

  test('8. adds a vehicle through the form', async ({ page }) => {
    await page.goto('/admin');
    await page.getByRole('link', { name: 'Add vehicle' }).click();

    await page.getByLabel('Make').fill('Voltline');
    await page.getByLabel('Model', { exact: true }).fill(model);
    await page.getByLabel('Category').selectOption('HATCHBACK');
    await page.getByLabel('Year').fill('2025');
    await page.getByLabel('Fuel type').selectOption('ELECTRIC');
    await page.getByLabel('Price (USD)').fill('38450');
    await page.getByLabel('Initial stock').fill('2');
    await page.getByLabel('Description').fill('Compact electric hatch added by the E2E suite.');
    await page.getByRole('button', { name: 'Add vehicle' }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole('status')).toContainText(`Voltline ${model} was added.`);

    const row = await findRow(page);
    vehicleId = (await row.getByRole('link', { name: `Voltline ${model}`, exact: true }).getAttribute('href'))!
      .split('/')
      .pop()!;
    expect(await vehicleRow(vehicleId)).toMatchObject({ quantity: 2, price: '38450.00' });
  });

  test('9a. updates the vehicle details', async ({ page }) => {
    const row = await findRow(page);
    await row.getByRole('link', { name: /Edit/ }).click();

    const price = page.getByLabel('Price (USD)');
    await expect(price).toHaveValue('38450');
    await price.fill('36990.50');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByRole('status')).toContainText(`Voltline ${model} was updated.`);
    await expect((await findRow(page)).getByText('$36,990.50')).toBeVisible();
    expect((await vehicleRow(vehicleId))?.price).toBe('36990.50');
  });

  test('9b. restocks the vehicle', async ({ page }) => {
    const row = await findRow(page);
    await row.getByRole('button', { name: /Restock/ }).click();

    const dialog = page.getByRole('dialog', { name: `Restock Voltline ${model}` });
    await dialog.getByLabel('Units to add').fill('3');
    await dialog.getByRole('button', { name: 'Add stock' }).click();

    await expect(page.getByRole('status')).toContainText('Added 3 units');
    await expect(row.getByText('5 in stock')).toBeVisible();
    expect((await vehicleRow(vehicleId))?.quantity).toBe(5);
  });

  test('10. deletes the vehicle after confirming', async ({ page }) => {
    const row = await findRow(page);
    await row.getByRole('button', { name: /Delete/ }).click();

    const dialog = page.getByRole('dialog', { name: `Delete Voltline ${model}?` });
    await dialog.getByRole('button', { name: 'Delete vehicle' }).click();

    await expect(page.getByRole('status')).toContainText(`Voltline ${model} was deleted.`);
    await expect(row).toHaveCount(0);
    expect(await vehicleRow(vehicleId)).toBeNull();
    expect((await page.request.get(`/api/vehicles/${vehicleId}`)).status()).toBe(404);
  });
});
