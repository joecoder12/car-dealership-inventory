import type { Request, RequestHandler } from 'express';
import { forbidden, unauthenticated } from '../errors/app-error.js';
import type { Role } from '../generated/prisma/enums.js';
import type { PublicUser } from '../modules/auth/auth.service.js';
import { ACCESS_COOKIE } from '../modules/auth/session-cookies.js';
import type { TokenService } from '../modules/auth/token-service.js';

export interface AuthContext {
  user: PublicUser;
  /** CSRF value signed into the token; compared with the X-CSRF-Token header. */
  csrfToken: string;
  /** Cookies are sent automatically by browsers, so only they need CSRF checks. */
  via: 'bearer' | 'cookie';
}

declare global {
  // Declaration merging is the idiomatic way to type data attached by middleware.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

function extractToken(req: Request): { token: string; via: AuthContext['via'] } {
  const header = req.get('authorization');
  if (header !== undefined) {
    const match = /^Bearer\s+(\S+)$/i.exec(header);
    if (!match?.[1]) throw unauthenticated('Malformed Authorization header');
    return { token: match[1], via: 'bearer' };
  }

  const cookie: unknown = req.cookies?.[ACCESS_COOKIE];
  if (typeof cookie === 'string' && cookie.length > 0) return { token: cookie, via: 'cookie' };

  throw unauthenticated();
}

export interface AuthMiddleware {
  requireAuth: RequestHandler;
  requireRole: (...roles: Role[]) => RequestHandler;
}

/**
 * `requireAuth` accepts a Bearer token (API clients) or the session cookie
 * (browser). The user is re-loaded from the database on every request so that
 * deleted accounts and role changes take effect immediately rather than when
 * the token expires.
 */
export function createAuthMiddleware(
  tokens: TokenService,
  findUser: (id: string) => Promise<PublicUser | null>,
): AuthMiddleware {
  const requireAuth: RequestHandler = async (req, _res, next) => {
    const { token, via } = extractToken(req);
    const claims = tokens.verify(token);

    const user = await findUser(claims.userId);
    if (!user) throw unauthenticated('Account no longer exists');

    req.auth = { user, csrfToken: claims.csrfToken, via };
    next();
  };

  const requireRole =
    (...roles: Role[]): RequestHandler =>
    (req, _res, next) => {
      if (!req.auth) throw unauthenticated();
      if (!roles.includes(req.auth.user.role)) throw forbidden();
      next();
    };

  return { requireAuth, requireRole };
}
