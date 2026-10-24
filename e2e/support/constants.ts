export const E2E_API_PORT = 4100;
export const E2E_WEB_PORT = 5190;
export const E2E_API_URL = `http://localhost:${E2E_API_PORT}`;

/**
 * Test-only administrator for the throwaway *_e2e database, created by
 * backend/scripts/e2e-server.ts on every run. Not valid anywhere else.
 */
export const E2E_ADMIN = {
  name: 'E2E Admin',
  email: 'e2e-admin@northlane.test',
  password: 'E2e-admin-only-Passw0rd',
};
