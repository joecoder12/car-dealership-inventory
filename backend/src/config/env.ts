import { z } from 'zod';

/** Raised when the process environment cannot produce a valid configuration. */
export class ConfigError extends Error {
  override name = 'ConfigError';
}

const PLACEHOLDER_SECRET = /replace-me/i;

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  DATABASE_URL: z
    .string()
    .regex(/^postgres(ql)?:\/\//, 'must be a postgresql:// connection string'),
  JWT_SECRET: z
    .string()
    .min(32, 'must be at least 32 characters')
    .refine((value) => !PLACEHOLDER_SECRET.test(value), 'is still the .env.example placeholder'),
  JWT_EXPIRES_IN_MINUTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(60),
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:5180')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url({ protocol: /^https?$/, error: 'must be absolute http(s) origins' }))),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  // Reverse proxies in front of the API (0 = clients connect directly).
  TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
});

export interface AppConfig {
  nodeEnv: 'development' | 'test' | 'production';
  isProduction: boolean;
  port: number;
  databaseUrl: string;
  jwt: { secret: string; expiresInMinutes: number };
  corsOrigins: string[];
  authRateLimitMax: number;
  /** How many proxy hops to trust when reading the client IP from X-Forwarded-For. */
  trustProxyHops: number;
}

/**
 * Validates environment variables once at startup so the server fails fast with
 * a readable list of problems instead of misbehaving later. Error messages name
 * the variable but never include its value, so secrets cannot leak into logs.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  // Treat `KEY=` lines in .env files as "not set" so defaults still apply.
  const normalised = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== undefined && value !== ''),
  );

  const result = envSchema.safeParse(normalised);
  if (!result.success) {
    const problems = result.error.issues.map(
      (issue) => `- ${issue.path.join('.') || 'environment'}: ${issue.message}`,
    );
    throw new ConfigError(`Invalid environment configuration:\n${problems.join('\n')}`);
  }

  const parsed = result.data;
  return {
    nodeEnv: parsed.NODE_ENV,
    isProduction: parsed.NODE_ENV === 'production',
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    jwt: { secret: parsed.JWT_SECRET, expiresInMinutes: parsed.JWT_EXPIRES_IN_MINUTES },
    corsOrigins: parsed.CORS_ORIGINS,
    authRateLimitMax: parsed.AUTH_RATE_LIMIT_MAX,
    trustProxyHops: parsed.TRUST_PROXY,
  };
}
