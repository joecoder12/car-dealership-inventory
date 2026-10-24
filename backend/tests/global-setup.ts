import { execFileSync } from 'node:child_process';
import { resolveTestDatabaseUrl } from './helpers/database.js';

/** Brings the test database schema up to date once before any test file runs. */
export default function setup(): void {
  const databaseUrl = resolveTestDatabaseUrl();
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
}
