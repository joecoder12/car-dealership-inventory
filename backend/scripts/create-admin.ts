// Creates an ADMIN account, or promotes an existing account to ADMIN.
//
//   ADMIN_PASSWORD='…' npm run admin:create -- --email admin@example.com --name "Dealer Admin"
//
// Name and email may also come from ADMIN_NAME / ADMIN_EMAIL. The password is
// only read from the ADMIN_PASSWORD environment variable (never a CLI flag), so
// it does not end up in `ps` output.
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { ensureAdmin } from '../src/bootstrap/admin.js';
import { createDatabaseClient } from '../src/db/client.js';

loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

const { values } = parseArgs({
  options: { email: { type: 'string' }, name: { type: 'string' } },
});

const email = values.email ?? process.env.ADMIN_EMAIL;
const name = values.name ?? process.env.ADMIN_NAME ?? 'Administrator';
const password = process.env.ADMIN_PASSWORD;
const databaseUrl = process.env.DATABASE_URL;

if (!email || !password || !databaseUrl) {
  console.error(
    'Usage: ADMIN_PASSWORD=… npm run admin:create -- --email <email> [--name <name>]\n' +
      'DATABASE_URL must also be set (see .env.example).',
  );
  process.exit(1);
}

const db = createDatabaseClient(databaseUrl);
try {
  const result = await ensureAdmin(db, { name, email, password });
  console.log(
    result.status === 'created'
      ? `Created admin account ${result.email}.`
      : `Promoted existing account ${result.email} to ADMIN (password unchanged).`,
  );
} catch (error) {
  console.error((error as Error).message);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
