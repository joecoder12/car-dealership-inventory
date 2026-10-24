import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeUser, makeVehicle, signInAs } from '../../test/fixtures';
import { useFakeInventory } from '../../test/fake-inventory';
import { renderRoute } from '../../test/render';
import { server } from '../../test/server';

const camry = () => makeVehicle({ make: 'Toyota', model: 'Camry XSE', price: 28999, quantity: 4 });

async function findCard(name: RegExp) {
  return screen.findByRole('article', { name });
}

describe('purchasing from the showroom', () => {
  it('gives every vehicle a Purchase button and disables it when sold out', async () => {
    useFakeInventory([camry(), makeVehicle({ make: 'Ford', model: 'Mustang GT', quantity: 0 })]);
    renderRoute('/');

    const available = await findCard(/toyota camry xse/i);
    const soldOut = await findCard(/ford mustang gt/i);
    expect(within(available).getByRole('button', { name: /purchase/i })).toBeEnabled();
    expect(within(soldOut).getByRole('button', { name: /purchase/i })).toBeDisabled();
    expect(within(soldOut).getByText('Sold out')).toBeVisible();
  });

  it('asks visitors to sign in first and brings them back to the vehicle', async () => {
    const [vehicle] = useFakeInventory([camry()]).vehicles;
    const { user, location } = renderRoute('/');

    await user.click(within(await findCard(/camry/i)).getByRole('button', { name: /purchase/i }));

    await waitFor(() =>
      expect(location()).toBe(`/login?redirect=${encodeURIComponent(`/vehicles/${vehicle!.id}`)}`),
    );
  });

  it('confirms the purchase, records it once, and shows the new stock level', async () => {
    signInAs(makeUser());
    const inventory = useFakeInventory([camry()]);
    const { user } = renderRoute('/');

    await user.click(within(await findCard(/camry/i)).getByRole('button', { name: /purchase/i }));
    const dialog = await screen.findByRole('dialog', { name: /confirm purchase/i });
    expect(within(dialog).getByText('Toyota Camry XSE')).toBeVisible();
    expect(within(dialog).getByTestId('purchase-total')).toHaveTextContent('$28,999');

    await user.click(within(dialog).getByRole('button', { name: /confirm purchase/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /purchase confirmed: 1 × toyota camry xse/i,
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(within(await findCard(/camry/i)).getByText('Only 3 left')).toBeVisible();

    const purchases = inventory.requests.filter((r) => r.path.endsWith('/purchase'));
    expect(purchases).toHaveLength(1);
    expect(purchases[0]!.body).toEqual({ quantity: 1 });
    expect(purchases[0]!.headers.get('Idempotency-Key')).toMatch(/^[\w-]{8,100}$/);
  });

  it('lets the buyer choose a quantity limited by stock and shows the total', async () => {
    signInAs(makeUser());
    const inventory = useFakeInventory([
      makeVehicle({ model: 'Corolla', price: 20000.5, quantity: 3 }),
    ]);
    const { user } = renderRoute('/');

    await user.click(within(await findCard(/corolla/i)).getByRole('button', { name: /purchase/i }));
    const dialog = await screen.findByRole('dialog');
    const quantity = within(dialog).getByLabelText(/quantity/i);
    expect(
      within(quantity)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['1', '2', '3']);

    await user.selectOptions(quantity, '2');
    expect(within(dialog).getByTestId('purchase-total')).toHaveTextContent('$40,001');
    await user.click(within(dialog).getByRole('button', { name: /confirm purchase/i }));

    await waitFor(() => expect(inventory.vehicles[0]!.quantity).toBe(1));
    expect(inventory.requests.at(-1)!.body).toEqual({ quantity: 2 });
  });

  it('explains a conflict when someone else bought the last unit and refreshes stock', async () => {
    signInAs(makeUser());
    const inventory = useFakeInventory([camry()]);
    const { user } = renderRoute('/');

    await user.click(within(await findCard(/camry/i)).getByRole('button', { name: /purchase/i }));
    const dialog = await screen.findByRole('dialog');
    inventory.vehicles[0]!.quantity = 0; // sold elsewhere while the dialog was open
    await user.click(within(dialog).getByRole('button', { name: /confirm purchase/i }));

    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /only 0 unit\(s\) in stock/i,
    );
    await user.click(within(dialog).getByRole('button', { name: /cancel/i }));
    const card = await findCard(/camry/i);
    await waitFor(() =>
      expect(within(card).getByRole('button', { name: /purchase/i })).toBeDisabled(),
    );
  });

  it('reuses the same Idempotency-Key when retrying after a network failure', async () => {
    signInAs(makeUser());
    const inventory = useFakeInventory([camry()]);
    const keys: string[] = [];
    server.use(
      http.post(
        '*/api/vehicles/:id/purchase',
        ({ request }) => {
          keys.push(request.headers.get('Idempotency-Key') ?? '');
          return HttpResponse.error();
        },
        { once: true },
      ),
    );
    const { user } = renderRoute('/');

    await user.click(within(await findCard(/camry/i)).getByRole('button', { name: /purchase/i }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /confirm purchase/i }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      /could not reach the server/i,
    );

    await user.click(within(dialog).getByRole('button', { name: /confirm purchase/i }));

    await waitFor(() => expect(inventory.vehicles[0]!.quantity).toBe(3));
    const retryKey = inventory.requests.at(-1)!.headers.get('Idempotency-Key');
    expect(retryKey).toBe(keys[0]);
  });

  it('is an accessible modal: focus moves in, Escape closes, focus returns', async () => {
    signInAs(makeUser());
    useFakeInventory([camry()]);
    const { user } = renderRoute('/');

    const trigger = within(await findCard(/camry/i)).getByRole('button', { name: /purchase/i });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
