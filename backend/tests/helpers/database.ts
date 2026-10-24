import { createDatabaseClient, type Database } from '../../src/db/client.js';

const DEFAULT_TEST_DATABASE_URL = 'postgresql://postgres@localhost:5432/car_dealership_test';

/**
 * Returns the integration-test database URL, refusing anything whose database
 * name does not end in `_test`. Tests truncate tables, so pointing them at a
 * development or production database by mistake must be impossible.
 */
export function resolveTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
  const databaseName = new URL(url).pathname.replace(/^\//, '');
  if (!databaseName.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against database "${databaseName}": name must end in _test.`,
    );
  }
  return url;
}

export function createTestDatabase(): Database {
  return createDatabaseClient(resolveTestDatabaseUrl());
}

export async function resetDatabase(db: Database): Promise<void> {
  await db.$executeRawUnsafe('TRUNCATE TABLE purchases, vehicles, users RESTART IDENTITY CASCADE');
}
