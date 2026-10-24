import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { E2E_ADMIN, E2E_API_PORT, E2E_WEB_PORT } from './e2e/support/constants';

// Picks up E2E_DATABASE_URL from the root .env when present.
loadEnv({ quiet: true });

/**
 * End-to-end tests drive a real browser against the real stack:
 * production frontend build (vite preview) → /api proxy → Express API → PostgreSQL
 * (a dedicated *_e2e database that is rebuilt from migrations on every run).
 */
export default defineConfig({
  testDir: './e2e',
  // One shared database: run specs one at a time for deterministic stock levels.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: `http://localhost:${E2E_WEB_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'npm run e2e:server -w backend',
      url: `http://localhost:${E2E_API_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        PORT: String(E2E_API_PORT),
        CORS_ORIGINS: `http://localhost:${E2E_WEB_PORT}`,
        E2E_ADMIN_EMAIL: E2E_ADMIN.email,
        E2E_ADMIN_PASSWORD: E2E_ADMIN.password,
      },
    },
    {
      command: `npm run build -w frontend && npm run preview -w frontend -- --port ${E2E_WEB_PORT}`,
      url: `http://localhost:${E2E_WEB_PORT}`,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_API_PROXY_TARGET: `http://localhost:${E2E_API_PORT}` },
    },
  ],
});
