import argon2 from 'argon2';

/**
 * Argon2id with the library defaults (64 MiB memory, 3 iterations, parallelism 4),
 * which meet the OWASP recommendation for password storage. The salt is random
 * per hash and encoded in the returned string.
 */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** Returns false, never throws, when the stored hash is corrupt or unrecognised. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}
