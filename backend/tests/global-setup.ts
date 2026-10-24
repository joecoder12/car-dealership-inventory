import { execFileSync } from 'node:child_process';
import { createTestDatabase, resolveTestDatabaseUrl } from './helpers/database.js';

/**
 * Rebuilds the test database schema from the migrations before any test file
 * runs, so every run starts from a known state regardless of what a previous
 * (possibly aborted) run left behind. `resolveTestDatabaseUrl` guarantees this
 * can only ever touch a database whose name ends in `_test`.
 */
export default async function setup(): Promise<void> {
  const databaseUrl = resolveTestDatabaseUrl();

  const db = createTestDatabase();
  try {
    await db.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await db.$executeRawUnsafe('CREATE SCHEMA public');
  } finally {
    await db.$disconnect();
  }

  try {
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'pipe',
      encoding: 'utf8',
    });
  } catch (error) {
    const { stdout = '', stderr = '' } = error as { stdout?: string; stderr?: string };
    throw new Error(`Applying migrations to the test database failed:\n${stdout}\n${stderr}`);
  }
}
