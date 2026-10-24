import { screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { makeAdmin, makeUser, signInAs } from '../test/fixtures';
import { renderRoute } from '../test/render';
import { server } from '../test/server';

describe('navigation and access control', () => {
  it('offers sign-in and registration to anonymous visitors', async () => {
    renderRoute('/');

    const nav = await screen.findByRole('navigation', { name: /main/i });
    expect(within(nav).getByRole('link', { name: /sign in/i })).toBeVisible();
    expect(within(nav).getByRole('link', { name: /create account/i })).toBeVisible();
    expect(within(nav).queryByRole('link', { name: /manage inventory/i })).not.toBeInTheDocument();
  });

  it('hides admin controls from ordinary users', async () => {
    signInAs(makeUser());
    renderRoute('/');

    await screen.findByRole('button', { name: /account menu for ada lovelace/i });
    expect(screen.queryByRole('link', { name: /manage inventory/i })).not.toBeInTheDocument();
  });

  it('shows the inventory link to admins', async () => {
    signInAs(makeAdmin());
    renderRoute('/');

    expect(await screen.findByRole('link', { name: /manage inventory/i })).toBeVisible();
  });

  it('sends anonymous visitors of an admin page to sign in first', async () => {
    const { location } = renderRoute('/admin');

    await waitFor(() => expect(location()).toBe('/login?redirect=%2Fadmin'));
  });

  it('tells signed-in non-admins they lack access to admin pages', async () => {
    signInAs(makeUser());
    renderRoute('/admin');

    expect(await screen.findByRole('heading', { name: /admins only/i })).toBeVisible();
  });

  it('signs the user out', async () => {
    signInAs(makeUser());
    let loggedOut = false;
    server.use(
      http.post('*/api/auth/logout', () => {
        loggedOut = true;
        server.use(http.get('*/api/auth/me', () => HttpResponse.json({}, { status: 401 })));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = renderRoute('/');

    await user.click(await screen.findByRole('button', { name: /account menu for ada lovelace/i }));
    await user.click(screen.getByRole('menuitem', { name: /sign out/i }));

    expect(await screen.findByRole('link', { name: /sign in/i })).toBeVisible();
    expect(loggedOut).toBe(true);
  });

  it('shows a friendly page for unknown routes', async () => {
    renderRoute('/no-such-page');

    expect(await screen.findByRole('heading', { name: /wrong turn/i })).toBeVisible();
    expect(screen.getByRole('link', { name: /back to the showroom/i })).toHaveAttribute(
      'href',
      '/',
    );
  });
});
