import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTokenService } from '../../src/modules/auth/token-service.js';
import { buildTestApp, createTestConfig } from '../helpers/app.js';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';
import { cookieValue, createUser, DEFAULT_PASSWORD, login } from '../helpers/factories.js';

const db = createTestDatabase();
const app = buildTestApp(db);

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

const registration = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Engines1843' };

function setCookies(response: request.Response): string[] {
  return ([] as string[]).concat(response.headers['set-cookie'] ?? []);
}

describe('POST /api/auth/register', () => {
  it('creates a USER account and returns it with an access token', async () => {
    const response = await request(app).post('/api/auth/register').send(registration);

    expect(response.status).toBe(201);
    expect(response.body.data.user).toEqual({
      id: expect.any(String),
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      role: 'USER',
      createdAt: expect.any(String),
    });
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(new Date(response.body.data.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('never exposes the password or its hash', async () => {
    const response = await request(app).post('/api/auth/register').send(registration);

    const body = JSON.stringify(response.body);
    expect(body).not.toContain(registration.password);
    expect(body).not.toMatch(/passwordHash|argon2/);
  });

  it('stores an Argon2id hash rather than the password', async () => {
    await request(app).post('/api/auth/register').send(registration);

    const stored = await db.user.findUniqueOrThrow({ where: { email: registration.email } });
    expect(stored.passwordHash).toMatch(/^\$argon2id\$/);
  });

  it('normalises the e-mail address (trim + lower-case) and trims the name', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...registration, name: '  Ada  ', email: '  Ada@Example.COM ' });

    expect(response.status).toBe(201);
    expect(response.body.data.user.email).toBe('ada@example.com');
    expect(response.body.data.user.name).toBe('Ada');
  });

  it('ignores any attempt to self-assign the ADMIN role', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...registration, role: 'ADMIN' });

    expect(response.status).toBe(201);
    expect(response.body.data.user.role).toBe('USER');
  });

  it('signs the browser in with an HttpOnly access cookie and a readable CSRF cookie', async () => {
    const response = await request(app).post('/api/auth/register').send(registration);
    const cookies = setCookies(response);

    const access = cookieValue(cookies, 'access_token');
    const csrf = cookieValue(cookies, 'csrf_token');
    expect(access).toMatch(/HttpOnly/i);
    expect(access).toMatch(/SameSite=Strict/i);
    expect(access).toMatch(/Path=\/api/);
    expect(csrf).toBeDefined();
    expect(csrf).not.toMatch(/HttpOnly/i);
  });

  it('rejects a duplicate e-mail regardless of case', async () => {
    await request(app).post('/api/auth/register').send(registration);

    const response = await request(app)
      .post('/api/auth/register')
      .send({ ...registration, email: 'ADA@example.com' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it('lets exactly one of two simultaneous registrations for the same e-mail succeed', async () => {
    const responses = await Promise.all([
      request(app).post('/api/auth/register').send(registration),
      request(app).post('/api/auth/register').send(registration),
    ]);

    expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
    expect(await db.user.count()).toBe(1);
  });

  it.each([
    ['name', { ...registration, name: ' ' }],
    ['email', { ...registration, email: 'not-an-email' }],
    ['password', { ...registration, password: 'short1' }],
    ['password', { ...registration, password: 'lettersonly' }],
    ['password', { ...registration, password: '1234567890' }],
  ])('rejects an invalid %s with field-level details', async (field, body) => {
    const response = await request(app).post('/api/auth/register').send(body);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: field })]),
    );
  });

  it('rejects a body that is missing entirely', async () => {
    const response = await request(app).post('/api/auth/register');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  it('returns the user and a token for valid credentials', async () => {
    const user = await createUser(db, { email: 'grace@example.com', name: 'Grace Hopper' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: DEFAULT_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ id: user.id, role: 'USER' });
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(cookieValue(setCookies(response), 'access_token')).toBeDefined();
  });

  it('accepts the e-mail in any case', async () => {
    await createUser(db, { email: 'grace@example.com' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'GRACE@Example.com', password: DEFAULT_PASSWORD });

    expect(response.status).toBe(200);
  });

  it('gives the same generic 401 for a wrong password and an unknown e-mail', async () => {
    await createUser(db, { email: 'grace@example.com' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'grace@example.com', password: 'WrongPassword1' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' });

    for (const response of [wrongPassword, unknownEmail]) {
      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
      expect(response.headers['set-cookie']).toBeUndefined();
    }
  });

  it('validates the request body', async () => {
    const response = await request(app).post('/api/auth/login').send({ email: 'x' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the signed-in user for a Bearer token', async () => {
    const user = await createUser(db);
    const { token } = await login(app, user.email);

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ id: user.id, email: user.email, role: 'USER' });
  });

  it('returns the signed-in user for the session cookie', async () => {
    const user = await createUser(db);
    const { cookies } = await login(app, user.email);

    const response = await request(app).get('/api/auth/me').set('Cookie', cookies);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(user.id);
  });

  it('requires authentication', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects an expired token', async () => {
    const user = await createUser(db);
    const config = createTestConfig();
    const twoHoursAgo = Date.now() - 2 * 60 * 60_000;
    const { token } = createTokenService(config.jwt, () => twoHoursAgo).issue(user);

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  it('rejects a malformed Authorization header', async () => {
    const response = await request(app).get('/api/auth/me').set('Authorization', 'Token abc');

    expect(response.status).toBe(401);
  });

  it('rejects a valid token whose user no longer exists', async () => {
    const user = await createUser(db);
    const { token } = await login(app, user.email);
    await db.user.delete({ where: { id: user.id } });

    const response = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('clears both session cookies', async () => {
    const response = await request(app).post('/api/auth/logout');
    const cookies = setCookies(response);

    expect(response.status).toBe(204);
    expect(cookieValue(cookies, 'access_token')).toMatch(/Expires=Thu, 01 Jan 1970/);
    expect(cookieValue(cookies, 'csrf_token')).toMatch(/Expires=Thu, 01 Jan 1970/);
  });
});

describe('auth rate limiting', () => {
  it('returns 429 once an IP exceeds the configured number of attempts', async () => {
    const limitedApp = buildTestApp(db, { config: createTestConfig({ AUTH_RATE_LIMIT_MAX: '3' }) });
    const attempt = () =>
      request(limitedApp)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'Whatever1' });

    for (let i = 0; i < 3; i += 1) {
      expect((await attempt()).status).toBe(401);
    }
    const blocked = await attempt();

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('limits each client separately behind a trusted reverse proxy', async () => {
    const proxiedApp = buildTestApp(db, {
      config: createTestConfig({ AUTH_RATE_LIMIT_MAX: '2', TRUST_PROXY: '1' }),
    });
    const attemptFrom = (ip: string) =>
      request(proxiedApp)
        .post('/api/auth/login')
        .set('X-Forwarded-For', ip)
        .send({ email: 'nobody@example.com', password: 'Whatever1' });

    await attemptFrom('203.0.113.1');
    await attemptFrom('203.0.113.1');

    expect((await attemptFrom('203.0.113.1')).status).toBe(429);
    expect((await attemptFrom('203.0.113.2')).status).toBe(401);
  });
});
