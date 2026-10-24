import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { unauthenticated } from '../../errors/app-error.js';
import type { Role } from '../../generated/prisma/enums.js';

export const TOKEN_ISSUER = 'car-dealership-api';
export const TOKEN_AUDIENCE = 'car-dealership-web';
const ALGORITHM = 'HS256';

const claimsSchema = z.object({
  sub: z.uuid(),
  role: z.enum(['USER', 'ADMIN']),
  csrf: z.string().min(32),
});

export interface IssuedToken {
  token: string;
  /** Random value embedded in the signed token; the browser must echo it in X-CSRF-Token. */
  csrfToken: string;
  expiresAt: Date;
}

export interface TokenClaims {
  userId: string;
  role: Role;
  csrfToken: string;
}

export interface TokenService {
  issue(user: { id: string; role: Role }): IssuedToken;
  /** @throws AppError 401 for any invalid, expired or malformed token. */
  verify(token: string): TokenClaims;
}

/**
 * Issues and verifies short-lived HS256 access tokens. The algorithm, issuer
 * and audience are pinned on verification, and the claim shape is validated,
 * so a token that is merely "signed with our secret" is not automatically
 * trusted. `now` is injectable to make expiry testable.
 */
export function createTokenService(
  options: { secret: string; expiresInMinutes: number },
  now: () => number = Date.now,
): TokenService {
  return {
    issue(user) {
      const csrfToken = randomBytes(32).toString('base64url');
      const issuedAt = Math.floor(now() / 1000);
      const expiresAt = issuedAt + options.expiresInMinutes * 60;

      const token = jwt.sign(
        { role: user.role, csrf: csrfToken, iat: issuedAt, exp: expiresAt },
        options.secret,
        { algorithm: ALGORITHM, subject: user.id, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE },
      );

      return { token, csrfToken, expiresAt: new Date(expiresAt * 1000) };
    },

    verify(token) {
      try {
        const payload = jwt.verify(token, options.secret, {
          algorithms: [ALGORITHM],
          issuer: TOKEN_ISSUER,
          audience: TOKEN_AUDIENCE,
          clockTimestamp: Math.floor(now() / 1000),
        });
        const claims = claimsSchema.parse(payload);
        return { userId: claims.sub, role: claims.role, csrfToken: claims.csrf };
      } catch {
        throw unauthenticated('Invalid or expired token');
      }
    },
  };
}
