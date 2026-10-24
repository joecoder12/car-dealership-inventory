import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { AppError } from '../../src/errors/app-error.js';
import {
  createTokenService,
  TOKEN_AUDIENCE,
  TOKEN_ISSUER,
} from '../../src/modules/auth/token-service.js';

const SECRET = 'unit-test-secret-that-is-at-least-32-chars';
const USER = { id: '0b6a4c1e-5d0e-4f7c-9b8a-2a1d3c4e5f60', role: 'USER' as const };

function expectUnauthenticated(fn: () => unknown) {
  try {
    fn();
    expect.fail('expected the token to be rejected');
  } catch (error) {
    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).status).toBe(401);
    expect((error as AppError).code).toBe('UNAUTHENTICATED');
  }
}

describe('token service', () => {
  const tokens = createTokenService({ secret: SECRET, expiresInMinutes: 60 });

  it('issues a token that verifies back to the same user, role and CSRF value', () => {
    const issued = tokens.issue(USER);
    const claims = tokens.verify(issued.token);

    expect(claims).toEqual({ userId: USER.id, role: 'USER', csrfToken: issued.csrfToken });
    expect(issued.csrfToken).toMatch(/^[A-Za-z0-9_-]{32,}$/);
  });

  it('reports when the token expires', () => {
    const now = Date.UTC(2026, 0, 1, 12, 0, 0);
    const clocked = createTokenService({ secret: SECRET, expiresInMinutes: 15 }, () => now);

    expect(clocked.issue(USER).expiresAt).toEqual(new Date(now + 15 * 60_000));
  });

  it('rejects an expired token', () => {
    const issuedAt = Date.now() - 2 * 60 * 60_000;
    const past = createTokenService({ secret: SECRET, expiresInMinutes: 60 }, () => issuedAt);
    const { token } = past.issue(USER);

    expectUnauthenticated(() => tokens.verify(token));
  });

  it('rejects a token signed with a different secret', () => {
    const other = createTokenService({ secret: `${SECRET}-other`, expiresInMinutes: 60 });

    expectUnauthenticated(() => tokens.verify(other.issue(USER).token));
  });

  it('rejects a tampered payload', () => {
    const [header, , signature] = tokens.issue(USER).token.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: USER.id, role: 'ADMIN', csrf: 'x', iss: TOKEN_ISSUER }),
    ).toString('base64url');

    expectUnauthenticated(() => tokens.verify(`${header}.${forgedPayload}.${signature}`));
  });

  it('only accepts HS256, even when another algorithm uses the right secret', () => {
    const hs512 = jwt.sign({ role: 'USER', csrf: 'x'.repeat(32) }, SECRET, {
      algorithm: 'HS512',
      subject: USER.id,
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      expiresIn: '1h',
    });

    expectUnauthenticated(() => tokens.verify(hs512));
  });

  it('rejects tokens minted for another issuer or audience', () => {
    const sign = (issuer: string, audience: string) =>
      jwt.sign({ role: 'USER', csrf: 'x'.repeat(32) }, SECRET, {
        subject: USER.id,
        issuer,
        audience,
        expiresIn: '1h',
      });

    expectUnauthenticated(() => tokens.verify(sign('someone-else', TOKEN_AUDIENCE)));
    expectUnauthenticated(() => tokens.verify(sign(TOKEN_ISSUER, 'another-app')));
  });

  it('rejects a correctly signed token whose claims have the wrong shape', () => {
    const badClaims = jwt.sign({ role: 'SUPERUSER', csrf: 'x'.repeat(32) }, SECRET, {
      subject: 'not-a-uuid',
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
      expiresIn: '1h',
    });

    expectUnauthenticated(() => tokens.verify(badClaims));
  });

  it('rejects garbage', () => {
    expectUnauthenticated(() => tokens.verify('not.a.jwt'));
  });
});
