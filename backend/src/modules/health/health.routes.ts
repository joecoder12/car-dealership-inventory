import { Router } from 'express';
import type { Database } from '../../db/client.js';
import type { Logger } from '../../logger.js';

/** Liveness plus a database round-trip, suitable for load-balancer health checks. */
export function createHealthRouter(db: Database, logger: Logger): Router {
  const router = Router();

  router.get('/', async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'up' });
    } catch (error) {
      logger.error('Health check: database unreachable', error);
      res.status(503).json({ status: 'degraded', database: 'down' });
    }
  });

  return router;
}
