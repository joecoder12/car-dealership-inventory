import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config/env.js';

const validEnv = {
  DATABASE_URL: 'postgresql://postgres@localhost:5432/car_dealership',
  JWT_SECRET: 'a'.repeat(48),
};

describe('loadConfig', () => {
  it('parses a minimal valid environment and applies defaults', () => {
    const config = loadConfig(validEnv);

    expect(config).toEqual({
      nodeEnv: 'development',
      isProduction: false,
      port: 4000,
      databaseUrl: validEnv.DATABASE_URL,
      jwt: { secret: validEnv.JWT_SECRET, expiresInMinutes: 60 },
      corsOrigins: ['http://localhost:5180'],
      authRateLimitMax: 20,
    });
  });

  it('coerces numeric values and splits comma-separated CORS origins', () => {
    const config = loadConfig({
      ...validEnv,
      NODE_ENV: 'production',
      PORT: '8080',
      JWT_EXPIRES_IN_MINUTES: '15',
      CORS_ORIGINS: 'https://cars.example.com, https://admin.example.com',
      AUTH_RATE_LIMIT_MAX: '5',
    });

    expect(config.isProduction).toBe(true);
    expect(config.port).toBe(8080);
    expect(config.jwt.expiresInMinutes).toBe(15);
    expect(config.corsOrigins).toEqual(['https://cars.example.com', 'https://admin.example.com']);
    expect(config.authRateLimitMax).toBe(5);
  });

  it('rejects a missing JWT secret', () => {
    expect(() => loadConfig({ DATABASE_URL: validEnv.DATABASE_URL })).toThrow(ConfigError);
  });

  it('rejects a JWT secret shorter than 32 characters', () => {
    expect(() => loadConfig({ ...validEnv, JWT_SECRET: 'too-short' })).toThrow(/JWT_SECRET/);
  });

  it('rejects the placeholder secret from .env.example', () => {
    expect(() =>
      loadConfig({ ...validEnv, JWT_SECRET: 'replace-me-with-a-long-random-secret' }),
    ).toThrow(/JWT_SECRET/);
  });

  it('rejects a DATABASE_URL that is not a PostgreSQL connection string', () => {
    expect(() => loadConfig({ ...validEnv, DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /DATABASE_URL/,
    );
  });

  it('rejects CORS origins that are not absolute http(s) URLs', () => {
    expect(() => loadConfig({ ...validEnv, CORS_ORIGINS: '*' })).toThrow(/CORS_ORIGINS/);
  });

  it('reports every invalid variable without echoing secret values', () => {
    const secret = 'short-secret-value';
    try {
      loadConfig({ JWT_SECRET: secret, PORT: 'not-a-port' });
      expect.fail('loadConfig should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      const message = (error as Error).message;
      expect(message).toMatch(/DATABASE_URL/);
      expect(message).toMatch(/JWT_SECRET/);
      expect(message).toMatch(/PORT/);
      expect(message).not.toContain(secret);
    }
  });
});
