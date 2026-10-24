import type { Express } from 'express';
import { createApp, type AppDependencies } from '../../src/app.js';
import { loadConfig, type AppConfig } from '../../src/config/env.js';
import type { Logger } from '../../src/logger.js';
import { resolveTestDatabaseUrl } from './database.js';

export const TEST_ORIGIN = 'http://localhost:5180';

export function createTestConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: resolveTestDatabaseUrl(),
    JWT_SECRET: 'test-only-secret-that-is-long-enough-1234567890',
    CORS_ORIGINS: TEST_ORIGIN,
    // High enough that ordinary tests never trip the auth rate limiter.
    AUTH_RATE_LIMIT_MAX: '1000',
    ...overrides,
  });
}

/** A logger that records instead of printing, so expected errors stay out of test output. */
export function createSilentLogger(): Logger & { errors: unknown[][] } {
  const errors: unknown[][] = [];
  return {
    errors,
    info: () => {},
    error: (...args: unknown[]) => {
      errors.push(args);
    },
  };
}

export function buildTestApp(
  db: AppDependencies['db'],
  options: { config?: AppConfig; logger?: Logger } = {},
): Express {
  return createApp({
    db,
    config: options.config ?? createTestConfig(),
    logger: options.logger ?? createSilentLogger(),
  });
}
