import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import type { Database } from '../../src/db/client.js';
import { buildTestApp, createSilentLogger, TEST_ORIGIN } from '../helpers/app.js';
import { createTestDatabase } from '../helpers/database.js';

describe('HTTP application shell', () => {
  const db = createTestDatabase();
  const app = buildTestApp(db);

  afterAll(() => db.$disconnect());

  describe('GET /api/health', () => {
    it('reports healthy when the database answers', async () => {
      const response = await request(app).get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok', database: 'up' });
    });

    it('returns 503 and logs the cause when the database is unreachable', async () => {
      const brokenDb = {
        $queryRaw: () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:5432')),
      } as unknown as Database;
      const logger = createSilentLogger();

      const response = await request(buildTestApp(brokenDb, { logger })).get('/api/health');

      expect(response.status).toBe(503);
      expect(response.body).toEqual({ status: 'degraded', database: 'down' });
      expect(logger.errors).toHaveLength(1);
    });
  });

  describe('error envelope', () => {
    it('answers unknown routes with a JSON 404', async () => {
      const response = await request(app).get('/api/does-not-exist');

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: { code: 'NOT_FOUND', message: 'Route GET /api/does-not-exist not found' },
      });
    });

    it('rejects malformed JSON with a 400 instead of a stack trace', async () => {
      const response = await request(app)
        .post('/api/health')
        .set('Content-Type', 'application/json')
        .send('{"broken": ');

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('MALFORMED_JSON');
      expect(JSON.stringify(response.body)).not.toMatch(/at .*\.js/);
    });

    it('rejects request bodies larger than 10 kB', async () => {
      const response = await request(app)
        .post('/api/health')
        .send({ padding: 'x'.repeat(11 * 1024) });

      expect(response.status).toBe(413);
      expect(response.body.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });

  describe('security headers and CORS', () => {
    it('sets hardening headers and hides the framework', async () => {
      const response = await request(app).get('/api/health');

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
      expect(response.headers['x-powered-by']).toBeUndefined();
    });

    it('allows credentialed requests from a configured origin', async () => {
      const response = await request(app).get('/api/health').set('Origin', TEST_ORIGIN);

      expect(response.headers['access-control-allow-origin']).toBe(TEST_ORIGIN);
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not grant CORS access to other origins', async () => {
      const response = await request(app).get('/api/health').set('Origin', 'https://evil.example');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
