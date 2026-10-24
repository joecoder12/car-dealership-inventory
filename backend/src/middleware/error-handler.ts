import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../errors/app-error.js';
import type { Logger } from '../logger.js';

/** Errors raised by express.json() carry a `type` describing what went wrong. */
interface BodyParserError {
  type?: string;
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
};

/**
 * Converts every error into the API's JSON error envelope. Expected errors keep
 * their status and message; anything unexpected becomes a generic 500 so stack
 * traces, SQL and other internals are logged server-side but never returned.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, req, res, _next) => {
    if (err instanceof AppError) {
      res.status(err.status).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.details ? { details: err.details } : {}),
        },
      });
      return;
    }

    const bodyError = err as BodyParserError;
    if (bodyError.type === 'entity.parse.failed') {
      res
        .status(400)
        .json({ error: { code: 'MALFORMED_JSON', message: 'Request body is not valid JSON' } });
      return;
    }
    if (bodyError.type === 'entity.too.large') {
      res
        .status(413)
        .json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body is too large' } });
      return;
    }

    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}`, err);
    res
      .status(500)
      .json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
  };
}
