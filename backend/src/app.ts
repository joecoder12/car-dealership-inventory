import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import type { Database } from './db/client.js';
import { consoleLogger, type Logger } from './logger.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createHealthRouter } from './modules/health/health.routes.js';

export interface AppDependencies {
  db: Database;
  config: AppConfig;
  logger?: Logger;
}

/**
 * Builds the Express application from injected dependencies. Nothing here opens
 * a port or reads process.env, so tests can construct as many isolated apps as
 * they need (real database, broken database, different config).
 */
export function createApp({ db, config, logger = consoleLogger }: AppDependencies): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.use('/api/health', createHealthRouter(db, logger));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
