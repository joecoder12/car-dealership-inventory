// Starts the API for Playwright end-to-end tests against a throwaway database.
//
// 1. Refuses to touch any database whose name does not end in _e2e.
// 2. Drops and recreates the schema, then applies every migration.
// 3. Creates the E2E admin account (test-only credentials from the environment).
// 4. Starts the real Express app on PORT with a freshly generated JWT secret.
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createApp } from '../src/app.js';
import { ensureAdmin } from '../src/bootstrap/admin.js';
import { loadConfig } from '../src/config/env.js';
import { createDatabaseClient } from '../src/db/client.js';

const databaseUrl =
  process.env.E2E_DATABASE_URL ?? 'postgresql://postgres@localhost:5432/car_dealership_e2e';
const databaseName = new URL(databaseUrl).pathname.slice(1);
if (!databaseName.endsWith('_e2e')) {
  throw new Error(`Refusing to reset "${databaseName}": E2E database name must end in _e2e.`);
}

const { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } = process.env;
if (!E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD) {
  throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set (see playwright.config.ts).');
}

const db = createDatabaseClient(databaseUrl);
await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
await db.$executeRawUnsafe('CREATE SCHEMA public');
execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: databaseUrl },
  stdio: 'inherit',
});
await ensureAdmin(db, { name: 'E2E Admin', email: E2E_ADMIN_EMAIL, password: E2E_ADMIN_PASSWORD });

const config = loadConfig({
  NODE_ENV: 'test',
  PORT: process.env.PORT ?? '4100',
  DATABASE_URL: databaseUrl,
  JWT_SECRET: randomBytes(48).toString('base64url'),
  CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:5190',
  AUTH_RATE_LIMIT_MAX: '1000',
});

createApp({ db, config }).listen(config.port, () => {
  console.log(`E2E API listening on http://localhost:${config.port} (database ${databaseName})`);
});
