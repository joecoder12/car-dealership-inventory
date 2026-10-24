import { Router, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import type { AppConfig } from '../../config/env.js';
import { parseInput } from '../../http/validate.js';
import type { AuthMiddleware } from '../../middleware/authenticate.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import type { AuthResult, AuthService } from './auth.service.js';
import { clearSessionCookies, setSessionCookies } from './session-cookies.js';

const FIFTEEN_MINUTES = 15 * 60 * 1000;

interface AuthRouterDependencies {
  authService: AuthService;
  requireAuth: AuthMiddleware['requireAuth'];
  config: AppConfig;
}

export function createAuthRouter({ authService, requireAuth, config }: AuthRouterDependencies) {
  const router = Router();
  const secureCookies = config.isProduction;

  // Slows credential stuffing and sign-up spam. In-memory store: fine for a
  // single instance; a multi-instance deployment would use a shared store.
  const authLimiter = rateLimit({
    windowMs: FIFTEEN_MINUTES,
    limit: config.authRateLimitMax,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' },
      });
    },
  });

  const startSession = (res: Response, status: number, result: AuthResult) => {
    setSessionCookies(res, result, secureCookies);
    res.status(status).json({
      data: { user: result.user, token: result.token, expiresAt: result.expiresAt },
    });
  };

  router.post('/register', authLimiter, async (req, res) => {
    const input = parseInput(registerSchema, req.body);
    startSession(res, 201, await authService.register(input));
  });

  router.post('/login', authLimiter, async (req, res) => {
    const input = parseInput(loginSchema, req.body);
    startSession(res, 200, await authService.login(input));
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ data: req.auth!.user });
  });

  router.post('/logout', (_req, res) => {
    clearSessionCookies(res, secureCookies);
    res.status(204).end();
  });

  return router;
}
