export interface ErrorDetail {
  path: string;
  message: string;
}

/**
 * An expected, client-facing failure. Services throw these; the error-handling
 * middleware turns them into `{ error: { code, message, details? } }` responses.
 * Anything that is not an AppError is treated as an unexpected 500.
 */
export class AppError extends Error {
  override name = 'AppError';

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
  }
}

export const validationError = (details: ErrorDetail[], message = 'Request validation failed') =>
  new AppError(400, 'VALIDATION_ERROR', message, details);

export const unauthenticated = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHENTICATED', message);

export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(403, 'FORBIDDEN', message);

export const notFound = (code: string, message: string) => new AppError(404, code, message);

export const conflict = (code: string, message: string) => new AppError(409, code, message);
