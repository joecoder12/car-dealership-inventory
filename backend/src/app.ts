import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import helmet from 'helmet';
import type { AppConfig } from './config/env.js';
import type { Database } from './db/client.js';
import { consoleLogger, type Logger } from './logger.js';
import { createAuthMiddleware } from './middleware/authenticate.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthService } from './modules/auth/auth.service.js';
import { createTokenService } from './modules/auth/token-service.js';
import { createHealthRouter } from './modules/health/health.routes.js';
import { createVehicleRouter } from './modules/vehicles/vehicle.routes.js';
import { createVehicleService } from './modules/vehicles/vehicle.service.js';

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

  const tokens = createTokenService(config.jwt);
  const authService = createAuthService(db, tokens);
  const { requireAuth, requireRole } = createAuthMiddleware(tokens, authService.findUser);
  const vehicleService = createVehicleService(db);

  app.use('/api/health', createHealthRouter(db, logger));
  app.use('/api/auth', createAuthRouter({ authService, requireAuth, config }));
  app.use('/api/vehicles', createVehicleRouter({ vehicleService, requireAuth, requireRole }));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));

  return app;
}
