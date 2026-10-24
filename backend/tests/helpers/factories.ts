import type { Express } from 'express';
import request from 'supertest';
import type { Database } from '../../src/db/client.js';
import type { Role } from '../../src/generated/prisma/enums.js';
import { hashPassword } from '../../src/modules/auth/password.js';

export const DEFAULT_PASSWORD = 'Password123';

// Argon2id is deliberately slow; hash the shared test password once per file.
let defaultPasswordHash: Promise<string> | undefined;

export async function createUser(
  db: Database,
  overrides: { name?: string; email?: string; role?: Role; password?: string } = {},
) {
  const passwordHash = overrides.password
    ? await hashPassword(overrides.password)
    : await (defaultPasswordHash ??= hashPassword(DEFAULT_PASSWORD));

  return db.user.create({
    data: {
      name: overrides.name ?? 'Test User',
      email: overrides.email ?? `user-${crypto.randomUUID()}@example.com`,
      role: overrides.role ?? 'USER',
      passwordHash,
    },
  });
}

export interface Session {
  token: string;
  csrfToken: string;
  cookies: string[];
}

/** Logs in through the real endpoint and returns what a client would hold afterwards. */
export async function login(app: Express, email: string, password = DEFAULT_PASSWORD) {
  const response = await request(app).post('/api/auth/login').send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Login failed in test setup: ${response.status} ${JSON.stringify(response.body)}`);
  }
  const cookies = ([] as string[]).concat(response.headers['set-cookie'] ?? []);
  const csrfCookie = cookies.find((cookie) => cookie.startsWith('csrf_token='));
  return {
    token: response.body.data.token as string,
    csrfToken: decodeURIComponent(csrfCookie?.split(';')[0]?.split('=')[1] ?? ''),
    cookies,
  } satisfies Session;
}

/** Creates a user with the given role and returns a Bearer-token session for them. */
export async function signedInAs(app: Express, db: Database, role: Role = 'USER') {
  const user = await createUser(db, { role });
  const session = await login(app, user.email);
  return { user, ...session, auth: { Authorization: `Bearer ${session.token}` } };
}

export function cookieValue(cookies: string[], name: string): string | undefined {
  return cookies.find((cookie) => cookie.startsWith(`${name}=`));
}
