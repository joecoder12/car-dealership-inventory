import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { makeAdmin, makeVehicle, signInAs } from '../../test/fixtures';
import { useFakeInventory } from '../../test/fake-inventory';
import { renderRoute } from '../../test/render';

const fleet = () => [
  makeVehicle({ make: 'Toyota', model: 'Camry', price: 30000, quantity: 4 }),
  makeVehicle({ make: 'Ford', model: 'Mustang GT', category: 'COUPE', price: 46000, quantity: 0 }),
  makeVehicle({ make: 'BMW', model: 'X5', category: 'SUV', price: 68000, quantity: 2 }),
];

describe('AdminInventoryPage', () => {
  it('summarises stock across the catalogue', async () => {
    signInAs(makeAdmin());
    useFakeInventory(fleet());
    renderRoute('/admin');

    const stats = await screen.findByRole('list', { name: /inventory summary/i });
    await waitFor(() => expect(within(stats).getByText('$256,000')).toBeVisible());
    expect(within(stats).getByText('Vehicles').nextSibling).toHaveTextContent('3');
    expect(within(stats).getByText('Units in stock').nextSibling).toHaveTextContent('6');
    expect(within(stats).getByText('Low stock').nextSibling).toHaveTextContent('1');
    expect(within(stats).getByText('Sold out').nextSibling).toHaveTextContent('1');
  });

  it('lists every vehicle with stock and management actions', async () => {
    signInAs(makeAdmin());
    const [camry] = useFakeInventory(fleet()).vehicles;
    renderRoute('/admin');

    const row = await screen.findByRole('row', { name: /toyota camry/i });
    expect(within(row).getByText('$30,000')).toBeVisible();
    expect(within(row).getByText('4 in stock')).toBeVisible();
    expect(within(row).getByRole('link', { name: /edit/i })).toHaveAttribute(
      'href',
      `/admin/vehicles/${camry!.id}/edit`,
    );
    expect(screen.getByRole('link', { name: /add vehicle/i })).toHaveAttribute(
      'href',
      '/admin/vehicles/new',
    );
  });

  it('restocks a vehicle and shows the new stock level', async () => {
    signInAs(makeAdmin());
    const inventory = useFakeInventory(fleet());
    const { user } = renderRoute('/admin');

    const row = await screen.findByRole('row', { name: /ford mustang gt/i });
    await user.click(within(row).getByRole('button', { name: /restock/i }));
    const dialog = await screen.findByRole('dialog', { name: /restock ford mustang gt/i });
    const amount = within(dialog).getByLabelText(/units to add/i);
    await user.clear(amount);
    await user.type(amount, '5');
    await user.click(within(dialog).getByRole('button', { name: /add stock/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/added 5 units/i);
    await waitFor(() =>
      expect(
        within(screen.getByRole('row', { name: /ford mustang gt/i })).getByText('5 in stock'),
      ).toBeVisible(),
    );
    expect(inventory.requests.at(-1)).toMatchObject({
      method: 'POST',
      body: { quantity: 5 },
    });
  });

  it('validates the restock amount before sending it', async () => {
    signInAs(makeAdmin());
    const inventory = useFakeInventory(fleet());
    const { user } = renderRoute('/admin');

    const row = await screen.findByRole('row', { name: /bmw x5/i });
    await user.click(within(row).getByRole('button', { name: /restock/i }));
    const dialog = await screen.findByRole('dialog');
    const amount = within(dialog).getByLabelText(/units to add/i);
    await user.clear(amount);
    await user.type(amount, '0');
    await user.click(within(dialog).getByRole('button', { name: /add stock/i }));

    expect(await within(dialog).findByText(/enter a whole number from 1 to 1000/i)).toBeVisible();
    expect(inventory.requests).toHaveLength(0);
  });

  it('deletes a vehicle only after confirmation', async () => {
    signInAs(makeAdmin());
    const inventory = useFakeInventory(fleet());
    const bmw = inventory.vehicles[2]!;
    const { user } = renderRoute('/admin');

    const row = await screen.findByRole('row', { name: /bmw x5/i });
    await user.click(within(row).getByRole('button', { name: /delete/i }));
    let dialog = await screen.findByRole('dialog', { name: /delete bmw x5\?/i });
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    expect(inventory.requests).toHaveLength(0);

    await user.click(within(row).getByRole('button', { name: /delete/i }));
    dialog = await screen.findByRole('dialog', { name: /delete bmw x5\?/i });
    await user.click(within(dialog).getByRole('button', { name: /delete vehicle/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(/bmw x5 was deleted/i);
    await waitFor(() =>
      expect(screen.queryByRole('row', { name: /bmw x5/i })).not.toBeInTheDocument(),
    );
    expect(inventory.requests).toEqual([
      expect.objectContaining({ method: 'DELETE', path: `/api/vehicles/${bmw.id}` }),
    ]);
  });
});
