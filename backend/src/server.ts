import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { ConfigError, loadConfig } from './config/env.js';
import { createDatabaseClient } from './db/client.js';
import { consoleLogger as logger } from './logger.js';

// Local development reads the repository-root .env; in production the real
// environment wins because dotenv never overrides variables that are already set.
loadEnv({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

function start(): void {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      logger.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  const db = createDatabaseClient(config.databaseUrl);
  const app = createApp({ db, config, logger });

  const server = app.listen(config.port, () => {
    logger.info(`API listening on http://localhost:${config.port} (${config.nodeEnv})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down`);
    server.close(() => {
      void db.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();
