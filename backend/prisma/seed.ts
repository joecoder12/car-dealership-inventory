// Loads the demo catalogue into the database named by DATABASE_URL.
// Repeatable: existing vehicles are left untouched. Creates no user accounts.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { seedCatalogue } from '../src/bootstrap/seed-catalogue.js';
import { createDatabaseClient } from '../src/db/client.js';

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set. Run `npm run setup:env` or export it first.');
  process.exit(1);
}

const db = createDatabaseClient(databaseUrl);
try {
  const { created, skipped } = await seedCatalogue(db);
  console.log(`Seed complete: ${created} vehicle(s) created, ${skipped} already present.`);
} finally {
  await db.$disconnect();
}
