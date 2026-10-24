import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'prisma/config';

// The single .env file lives at the repository root.
loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Optional so `prisma generate` works without a database (e.g. on install).
    url: process.env.DATABASE_URL,
  },
});
