import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/modules/auth/password.js';

describe('password hashing', () => {
  it('produces an Argon2id hash that does not contain the password', async () => {
    const hash = await hashPassword('Sup3r-secret');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('Sup3r-secret');
  });

  it('salts every hash, so equal passwords produce different hashes', async () => {
    const [first, second] = await Promise.all([
      hashPassword('Sup3r-secret'),
      hashPassword('Sup3r-secret'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifies the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('Sup3r-secret');

    await expect(verifyPassword(hash, 'Sup3r-secret')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'sup3r-secret')).resolves.toBe(false);
  });

  it('treats a malformed stored hash as a failed match instead of throwing', async () => {
    await expect(verifyPassword('not-a-hash', 'anything')).resolves.toBe(false);
  });
});
