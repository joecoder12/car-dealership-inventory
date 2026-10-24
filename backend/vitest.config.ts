import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Pick up TEST_DATABASE_URL from the root .env when it is not already set.
loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    // Integration tests share one PostgreSQL test database, so files run one at a time.
    fileParallelism: false,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/generated/**', 'src/server.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
