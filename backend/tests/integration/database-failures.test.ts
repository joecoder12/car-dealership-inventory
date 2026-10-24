import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { Database } from '../../src/db/client.js';
import { buildTestApp, createSilentLogger } from '../helpers/app.js';

/**
 * What clients see when PostgreSQL fails mid-request: a generic 500 with no
 * driver message, SQL or stack trace, while the real cause is logged.
 */
const connectionLost = () => Promise.reject(new Error('Connection terminated unexpectedly'));

function appWithBrokenDatabase() {
  const brokenDb = {
    $transaction: connectionLost,
    $queryRaw: connectionLost,
    vehicle: { findUnique: connectionLost, count: connectionLost, findMany: connectionLost },
    user: { create: connectionLost, findUnique: connectionLost },
  } as unknown as Database;
  const logger = createSilentLogger();
  return { app: buildTestApp(brokenDb, { logger }), logger };
}

describe('unexpected database failures', () => {
  it.each([
    ['GET', '/api/vehicles'],
    ['GET', '/api/vehicles/search?q=camry'],
    ['GET', `/api/vehicles/${crypto.randomUUID()}`],
  ])('%s %s returns a generic 500 and logs the cause', async (_method, path) => {
    const { app, logger } = appWithBrokenDatabase();

    const response = await request(app).get(path);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
    expect(logger.errors).toHaveLength(1);
  });

  it('does not leak driver errors from registration', async () => {
    const { app } = appWithBrokenDatabase();

    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: 'Engines1843' });

    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain('Connection terminated');
  });
});
