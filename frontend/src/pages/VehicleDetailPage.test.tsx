import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeUser, makeVehicle, signInAs } from '../test/fixtures';
import { useFakeInventory } from '../test/fake-inventory';
import { renderRoute } from '../test/render';

describe('VehicleDetailPage', () => {
  it('shows the full details of a vehicle', async () => {
    const [vehicle] = useFakeInventory([
      makeVehicle({
        make: 'Hyundai',
        model: 'Ioniq 5 Limited',
        category: 'SUV',
        price: 52600,
        quantity: 4,
        year: 2025,
        fuelType: 'ELECTRIC',
        description: 'Ultra-fast-charging electric crossover.',
      }),
    ]).vehicles;
    renderRoute(`/vehicles/${vehicle!.id}`);

    expect(
      await screen.findByRole('heading', { level: 1, name: /hyundai ioniq 5 limited/i }),
    ).toBeVisible();
    expect(screen.getByText('$52,600')).toBeVisible();
    expect(screen.getByText('Ultra-fast-charging electric crossover.')).toBeVisible();
    const specs = screen.getByRole('list', { name: /specifications/i });
    expect(within(specs).getByText('SUV')).toBeVisible();
    expect(within(specs).getByText('2025')).toBeVisible();
    expect(within(specs).getByText('Electric')).toBeVisible();
    expect(screen.getByText('4 in stock')).toBeVisible();
    expect(screen.getByRole('link', { name: /back to showroom/i })).toHaveAttribute('href', '/');
  });

  it('lets a signed-in user buy from the detail page and updates the stock shown', async () => {
    signInAs(makeUser());
    const [vehicle] = useFakeInventory([makeVehicle({ model: 'Civic', quantity: 2 })]).vehicles;
    const { user } = renderRoute(`/vehicles/${vehicle!.id}`);

    await user.click(await screen.findByRole('button', { name: /purchase/i }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /confirm purchase/i }),
    );

    expect(await screen.findByText('Only 1 left')).toBeVisible();
  });

  it('shows a not-found state for an unknown vehicle', async () => {
    useFakeInventory([]);
    renderRoute('/vehicles/00000000-0000-4000-8000-000000009999');

    expect(await screen.findByRole('heading', { name: /vehicle not found/i })).toBeVisible();
  });
});
