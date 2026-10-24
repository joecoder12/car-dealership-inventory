import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

/**
 * Network-level API mock shared by all component tests. Default handlers model
 * an anonymous visitor; individual tests override them with `server.use(...)`.
 * Unhandled requests fail the test, so every call a component makes is explicit.
 */
export const server = setupServer(
  http.get('*/api/auth/me', () =>
    HttpResponse.json(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentication required' } },
      { status: 401 },
    ),
  ),
);
