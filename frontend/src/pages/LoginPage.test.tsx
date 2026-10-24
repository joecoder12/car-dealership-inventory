import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorBody, makeUser, signInAs } from '../test/fixtures';
import { renderRoute } from '../test/render';
import { server } from '../test/server';

describe('LoginPage', () => {
  it('renders an accessible sign-in form', async () => {
    renderRoute('/login');

    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('validates fields before calling the API', async () => {
    let called = false;
    server.use(
      http.post('*/api/auth/login', () => {
        called = true;
        return HttpResponse.json({});
      }),
    );
    const { user } = renderRoute('/login');

    await user.type(await screen.findByLabelText(/email/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
    expect(called).toBe(false);
  });

  it('signs the user in and returns them to where they were going', async () => {
    const ada = makeUser();
    server.use(
      http.post('*/api/auth/login', async ({ request }) => {
        expect(await request.json()).toEqual({ email: 'ada@example.com', password: 'Engines1843' });
        signInAs(ada);
        return HttpResponse.json({ data: { user: ada, token: 't', expiresAt: '2030-01-01' } });
      }),
    );
    const { user, location } = renderRoute('/login?redirect=%2Fvehicles%2Fabc');

    await user.type(await screen.findByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Engines1843');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(location()).toBe('/vehicles/abc'));
    expect(
      await screen.findByRole('button', { name: /account menu for ada lovelace/i }),
    ).toBeVisible();
  });

  it('ignores redirects to other sites', async () => {
    const ada = makeUser();
    server.use(
      http.post('*/api/auth/login', () => {
        signInAs(ada);
        return HttpResponse.json({ data: { user: ada, token: 't', expiresAt: '2030-01-01' } });
      }),
    );
    const { user, location } = renderRoute('/login?redirect=https%3A%2F%2Fevil.example');

    await user.type(await screen.findByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Engines1843');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(location()).toBe('/'));
  });

  it('shows the server’s generic message for bad credentials', async () => {
    server.use(
      http.post('*/api/auth/login', () =>
        HttpResponse.json(errorBody('INVALID_CREDENTIALS', 'Invalid email or password'), {
          status: 401,
        }),
      ),
    );
    const { user, location } = renderRoute('/login');

    await user.type(await screen.findByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(location()).toBe('/login');
  });

  it('sends an already signed-in visitor to the requested page, not the showroom', async () => {
    // Regression: after a successful sign-in the GuestOnly guard re-renders with
    // the new session and used to race LoginPage's own redirect, sending users
    // to "/" instead of e.g. /admin in a real browser.
    signInAs(makeUser({ role: 'ADMIN' }));
    const { location } = renderRoute('/login?redirect=%2Fadmin');

    await waitFor(() => expect(location()).toBe('/admin'));
  });

  it('sends visitors who are already signed in to the showroom', async () => {
    signInAs(makeUser());
    const { location } = renderRoute('/login');

    await waitFor(() => expect(location()).toBe('/'));
  });
});
