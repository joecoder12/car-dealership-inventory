import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../test/server';
import { ApiError, apiRequest, buildQuery } from './api-client';

describe('apiRequest', () => {
  it('fetches JSON from the same-origin /api path and includes credentials', async () => {
    let credentials: RequestCredentials | undefined;
    server.use(
      http.get('*/api/vehicles', ({ request }) => {
        credentials = request.credentials;
        return HttpResponse.json({ data: [], meta: { total: 0 } });
      }),
    );

    const body = await apiRequest('/vehicles');

    expect(body).toEqual({ data: [], meta: { total: 0 } });
    expect(credentials).toBe('include');
  });

  it('sends JSON bodies with the CSRF token taken from the csrf_token cookie', async () => {
    document.cookie = 'csrf_token=abc123; path=/';
    let seen: { csrf: string | null; type: string | null; body: unknown } | undefined;
    server.use(
      http.post('*/api/vehicles', async ({ request }) => {
        seen = {
          csrf: request.headers.get('X-CSRF-Token'),
          type: request.headers.get('Content-Type'),
          body: await request.json(),
        };
        return HttpResponse.json({ data: { id: '1' } }, { status: 201 });
      }),
    );

    await apiRequest('/vehicles', { method: 'POST', body: { make: 'Kia' } });

    expect(seen).toEqual({ csrf: 'abc123', type: 'application/json', body: { make: 'Kia' } });
  });

  it('does not attach a CSRF header to safe requests', async () => {
    document.cookie = 'csrf_token=abc123; path=/';
    let csrf: string | null = 'unset';
    server.use(
      http.get('*/api/vehicles', ({ request }) => {
        csrf = request.headers.get('X-CSRF-Token');
        return HttpResponse.json({ data: [] });
      }),
    );

    await apiRequest('/vehicles');

    expect(csrf).toBeNull();
  });

  it('passes extra headers through (e.g. Idempotency-Key)', async () => {
    let key: string | null = null;
    server.use(
      http.post('*/api/vehicles/v1/purchase', ({ request }) => {
        key = request.headers.get('Idempotency-Key');
        return HttpResponse.json({ data: {} }, { status: 201 });
      }),
    );

    await apiRequest('/vehicles/v1/purchase', {
      method: 'POST',
      headers: { 'Idempotency-Key': 'key-12345678' },
    });

    expect(key).toBe('key-12345678');
  });

  it('returns undefined for 204 No Content', async () => {
    server.use(http.delete('*/api/vehicles/v1', () => new HttpResponse(null, { status: 204 })));

    await expect(apiRequest('/vehicles/v1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('turns the API error envelope into an ApiError', async () => {
    server.use(
      http.post('*/api/auth/register', () =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: [{ path: 'email', message: 'Enter a valid email address' }],
            },
          },
          { status: 400 },
        ),
      ),
    );

    const error = await apiRequest('/auth/register', { method: 'POST', body: {} }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: [{ path: 'email', message: 'Enter a valid email address' }],
    });
    expect((error as ApiError).fieldErrors()).toEqual({ email: 'Enter a valid email address' });
  });

  it('handles non-JSON error responses such as a proxy 502 page', async () => {
    server.use(
      http.get(
        '*/api/vehicles',
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    );

    await expect(apiRequest('/vehicles')).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: 'The server returned an unexpected response (502).',
    });
  });

  it('reports network failures in plain language', async () => {
    server.use(http.get('*/api/vehicles', () => HttpResponse.error()));

    await expect(apiRequest('/vehicles')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Could not reach the server. Check your connection and try again.',
    });
  });
});

describe('buildQuery', () => {
  it('omits empty values and encodes the rest', () => {
    expect(
      buildQuery({ q: 'land cruiser', make: '', page: 2, minPrice: undefined, inStock: true }),
    ).toBe('?q=land+cruiser&page=2&inStock=true');
  });

  it('returns an empty string when nothing is set', () => {
    expect(buildQuery({ q: '', page: undefined })).toBe('');
  });
});
