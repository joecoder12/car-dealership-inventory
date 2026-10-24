import { Prisma } from '../generated/prisma/client.js';

/** True when a write failed because it would violate a unique constraint. */
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

/** True when an update/delete targeted a row that does not exist. */
export function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
