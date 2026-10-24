import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorBody, makeUser, makeVehicle, signInAs } from '../test/fixtures';
import { useFakeInventory } from '../test/fake-inventory';
import { renderRoute } from '../test/render';
import { server } from '../test/server';

describe('session expiry', () => {
  it('drops back to the signed-out state when the API answers 401', async () => {
    signInAs(makeUser());
    useFakeInventory([makeVehicle({ model: 'Camry', quantity: 2 })]);
    server.use(
      http.post('*/api/vehicles/:id/purchase', () =>
        HttpResponse.json(errorBody('UNAUTHENTICATED', 'Invalid or expired token'), {
          status: 401,
        }),
      ),
    );
    const { user } = renderRoute('/');

    const card = await screen.findByRole('article', { name: /camry/i });
    await user.click(within(card).getByRole('button', { name: /purchase/i }));
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: /confirm/i }),
    );

    // The token expired between page load and purchase: the header must stop
    // claiming the user is signed in.
    expect(await screen.findByRole('link', { name: /sign in/i })).toBeVisible();
    expect(screen.queryByRole('button', { name: /account menu/i })).not.toBeInTheDocument();
  });
});

describe('modal focus trap', () => {
  it('keeps keyboard focus inside the dialog when tabbing past either end', async () => {
    signInAs(makeUser());
    useFakeInventory([makeVehicle({ model: 'Civic', quantity: 2 })]);
    const { user } = renderRoute('/');

    const card = await screen.findByRole('article', { name: /civic/i });
    await user.click(within(card).getByRole('button', { name: /purchase/i }));
    const dialog = await screen.findByRole('dialog');
    const quantity = within(dialog).getByLabelText(/quantity/i);
    const confirm = within(dialog).getByRole('button', { name: /confirm purchase/i });

    await waitFor(() => expect(quantity).toHaveFocus());
    await user.tab({ shift: true });
    expect(confirm).toHaveFocus();
    await user.tab();
    expect(quantity).toHaveFocus();
  });
});
