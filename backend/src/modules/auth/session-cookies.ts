import type { CookieOptions, Response } from 'express';
import type { IssuedToken } from './token-service.js';

export const ACCESS_COOKIE = 'access_token';
export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';

/**
 * Browser session = two cookies:
 * - access_token: the JWT. HttpOnly so injected scripts cannot read it, and
 *   scoped to /api so it is only sent to the API.
 * - csrf_token: readable by the SPA, which echoes it in the X-CSRF-Token header.
 *   The same value is signed into the JWT, so a forged header cannot match.
 * Both are SameSite=Strict, and Secure whenever we run in production.
 */
export function setSessionCookies(res: Response, issued: IssuedToken, secure: boolean): void {
  const common: CookieOptions = { sameSite: 'strict', secure, expires: issued.expiresAt };
  res.cookie(ACCESS_COOKIE, issued.token, { ...common, httpOnly: true, path: '/api' });
  res.cookie(CSRF_COOKIE, issued.csrfToken, { ...common, httpOnly: false, path: '/' });
}

export function clearSessionCookies(res: Response, secure: boolean): void {
  res.clearCookie(ACCESS_COOKIE, { sameSite: 'strict', secure, httpOnly: true, path: '/api' });
  res.clearCookie(CSRF_COOKIE, { sameSite: 'strict', secure, path: '/' });
}
