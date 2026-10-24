import type { z } from 'zod';
import { validationError } from '../errors/app-error.js';

/**
 * Parses untrusted input (body, query, params) with a Zod schema and returns the
 * typed, normalised result. Failures become a 400 VALIDATION_ERROR listing every
 * problem by field path, so clients can show messages next to the right input.
 */
export function parseInput<Schema extends z.ZodType>(
  schema: Schema,
  input: unknown,
): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw validationError(
      result.error.issues.map((issue) => ({
        path: issue.path.map(String).join('.') || 'body',
        message: issue.message,
      })),
    );
  }
  return result.data;
}
