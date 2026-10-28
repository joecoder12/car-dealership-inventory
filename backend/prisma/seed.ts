// Loads the demo catalogue into the database named by DATABASE_URL.
// Repeatable: existing vehicles are left untouched. Creates no user accounts.
// With --if-empty it only seeds a database that has no vehicles yet, so a
// deployment can run it on every build without re-adding vehicles an admin
// has since deleted.
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
  if (process.argv.includes('--if-empty') && (await db.vehicle.count()) > 0) {
    console.log('Seed skipped: the catalogue already has vehicles.');
  } else {
    const { created, skipped } = await seedCatalogue(db);
    console.log(`Seed complete: ${created} vehicle(s) created, ${skipped} already present.`);
  }
} finally {
  await db.$disconnect();
}
