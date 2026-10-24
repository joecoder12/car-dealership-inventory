import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { errorBody, makeUser, signInAs } from '../test/fixtures';
import { renderRoute } from '../test/render';
import { server } from '../test/server';

describe('RegisterPage', () => {
  it('explains the password rules and validates every field', async () => {
    const { user } = renderRoute('/register');

    expect(await screen.findByRole('heading', { name: /create your account/i })).toBeVisible();
    expect(
      screen.getByText(/at least 8 characters, including a letter and a number/i),
    ).toBeVisible();

    await user.type(screen.getByLabelText(/email/i), 'ada@');
    await user.type(screen.getByLabelText(/^password/i), 'lettersonly');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Name is required')).toBeVisible();
    expect(screen.getByText('Enter a valid email address')).toBeVisible();
    expect(screen.getByText('Password must contain at least one number')).toBeVisible();
  });

  it('creates the account, signs the user in and welcomes them', async () => {
    const ada = makeUser();
    server.use(
      http.post('*/api/auth/register', async ({ request }) => {
        expect(await request.json()).toEqual({
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          password: 'Engines1843',
        });
        signInAs(ada);
        return HttpResponse.json(
          { data: { user: ada, token: 't', expiresAt: '2030-01-01' } },
          { status: 201 },
        );
      }),
    );
    const { user, location } = renderRoute('/register');

    await user.type(await screen.findByLabelText(/name/i), 'Ada Lovelace');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Engines1843');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => expect(location()).toBe('/'));
    expect(await screen.findByRole('status')).toHaveTextContent(/welcome, ada/i);
  });

  it('shows a duplicate e-mail error next to the e-mail field', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          errorBody('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists'),
          { status: 409 },
        ),
      ),
    );
    const { user } = renderRoute('/register');

    await user.type(await screen.findByLabelText(/name/i), 'Ada');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Engines1843');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('An account with this email already exists')).toBeVisible();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-invalid', 'true');
  });

  it('maps server-side validation details onto the matching fields', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          errorBody('VALIDATION_ERROR', 'Request validation failed', [
            { path: 'password', message: 'Password must be at most 128 characters' },
          ]),
          { status: 400 },
        ),
      ),
    );
    const { user } = renderRoute('/register');

    await user.type(await screen.findByLabelText(/name/i), 'Ada');
    await user.type(screen.getByLabelText(/email/i), 'ada@example.com');
    await user.type(screen.getByLabelText(/^password/i), 'Engines1843');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Password must be at most 128 characters')).toBeVisible();
  });
});
