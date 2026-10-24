import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorBody, makeAdmin, makeVehicle, signInAs } from '../../test/fixtures';
import { useFakeInventory } from '../../test/fake-inventory';
import { renderRoute } from '../../test/render';
import { server } from '../../test/server';

describe('VehicleFormPage — add', () => {
  it('validates required fields and formats before sending', async () => {
    signInAs(makeAdmin());
    const inventory = useFakeInventory([]);
    const { user } = renderRoute('/admin/vehicles/new');

    await screen.findByRole('heading', { name: /add a vehicle/i });
    await user.type(screen.getByLabelText(/^price/i), '-5');
    await user.type(screen.getByLabelText(/initial stock/i), '1.5');
    await user.type(screen.getByLabelText(/image url/i), 'http://insecure.example/car.jpg');
    await user.click(screen.getByRole('button', { name: /add vehicle/i }));

    expect(await screen.findByText('Make is required')).toBeVisible();
    expect(screen.getByText('Model is required')).toBeVisible();
    expect(screen.getByText('Choose a category')).toBeVisible();
    expect(screen.getByText('Price must be greater than 0')).toBeVisible();
    expect(screen.getByText('Stock must be a whole number')).toBeVisible();
    expect(screen.getByText('Image URL must be an https:// URL')).toBeVisible();
    expect(inventory.requests).toHaveLength(0);
  });

  it('creates the vehicle with typed values and returns to the inventory', async () => {
    signInAs(makeAdmin());
    const inventory = useFakeInventory([]);
    const { user, location } = renderRoute('/admin/vehicles/new');

    await user.type(await screen.findByLabelText(/^make/i), 'Kia');
    await user.type(screen.getByLabelText(/^model/i), 'EV9 GT-Line');
    await user.selectOptions(screen.getByLabelText(/category/i), 'SUV');
    await user.type(screen.getByLabelText(/^price/i), '65490.50');
    await user.type(screen.getByLabelText(/initial stock/i), '3');
    await user.type(screen.getByLabelText(/year/i), '2025');
    await user.selectOptions(screen.getByLabelText(/fuel/i), 'ELECTRIC');
    await user.click(screen.getByRole('button', { name: /add vehicle/i }));

    await waitFor(() => expect(location()).toBe('/admin'));
    expect(await screen.findByRole('status')).toHaveTextContent(/kia ev9 gt-line was added/i);
    expect(inventory.requests[0]).toMatchObject({
      method: 'POST',
      path: '/api/vehicles',
      body: {
        make: 'Kia',
        model: 'EV9 GT-Line',
        category: 'SUV',
        price: 65490.5,
        quantity: 3,
        year: 2025,
        fuelType: 'ELECTRIC',
        description: null,
        imageUrl: null,
      },
    });
  });

  it('shows server-side validation errors next to the right fields', async () => {
    signInAs(makeAdmin());
    useFakeInventory([]);
    server.use(
      http.post('*/api/vehicles', () =>
        HttpResponse.json(
          errorBody('VALIDATION_ERROR', 'Request validation failed', [
            { path: 'year', message: 'Year cannot be beyond next year' },
          ]),
          { status: 400 },
        ),
      ),
    );
    const { user } = renderRoute('/admin/vehicles/new');

    await user.type(await screen.findByLabelText(/^make/i), 'Kia');
    await user.type(screen.getByLabelText(/^model/i), 'EV9');
    await user.selectOptions(screen.getByLabelText(/category/i), 'SUV');
    await user.type(screen.getByLabelText(/^price/i), '50000');
    await user.type(screen.getByLabelText(/initial stock/i), '1');
    await user.type(screen.getByLabelText(/year/i), '2026');
    await user.click(screen.getByRole('button', { name: /add vehicle/i }));

    expect(await screen.findByText('Year cannot be beyond next year')).toBeVisible();
  });
});

describe('VehicleFormPage — edit', () => {
  it('pre-fills the details and saves them without touching stock', async () => {
    signInAs(makeAdmin());
    const inventory = useFakeInventory([
      makeVehicle({ make: 'Honda', model: 'Civic', price: 24500, quantity: 7, year: 2023 }),
    ]);
    const vehicle = inventory.vehicles[0]!;
    const { user, location } = renderRoute(`/admin/vehicles/${vehicle.id}/edit`);

    const model = await screen.findByLabelText(/^model/i);
    expect(model).toHaveValue('Civic');
    expect(screen.getByLabelText(/^price/i)).toHaveValue(24500);
    expect(screen.queryByLabelText(/initial stock/i)).not.toBeInTheDocument();
    expect(screen.getByText(/7 units in stock/i)).toBeVisible();

    await user.clear(model);
    await user.type(model, 'Civic Type R');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => expect(location()).toBe('/admin'));
    const update = inventory.requests.find((request) => request.method === 'PUT');
    expect(update?.path).toBe(`/api/vehicles/${vehicle.id}`);
    expect(update?.body).toMatchObject({ make: 'Honda', model: 'Civic Type R', price: 24500 });
    expect(update?.body).not.toHaveProperty('quantity');
  });

  it('shows a not-found message for an unknown vehicle', async () => {
    signInAs(makeAdmin());
    useFakeInventory([]);
    renderRoute('/admin/vehicles/00000000-0000-4000-8000-000000009999/edit');

    expect(await screen.findByRole('heading', { name: /vehicle not found/i })).toBeVisible();
  });
});
