import { randomUUID } from 'node:crypto';
import type { Database } from '../../db/client.js';
import { isUniqueViolation } from '../../db/errors.js';
import { AppError, conflict } from '../../errors/app-error.js';
import type { Role } from '../../generated/prisma/enums.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { hashPassword, verifyPassword } from './password.js';
import type { IssuedToken, TokenService } from './token-service.js';

/** The only user fields that ever leave the server. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface AuthResult extends IssuedToken {
  user: PublicUser;
}

export interface AuthService {
  register(input: RegisterInput): Promise<AuthResult>;
  login(input: LoginInput): Promise<AuthResult>;
  findUser(id: string): Promise<PublicUser | null>;
}

const publicUserFields = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} as const;

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

export function createAuthService(db: Database, tokens: TokenService): AuthService {
  // Verified against when the email is unknown, so a failed login takes about
  // as long whether or not the account exists (no user enumeration by timing).
  let dummyHash: Promise<string> | undefined;

  return {
    async register({ name, email, password }) {
      const passwordHash = await hashPassword(password);
      try {
        // Role is never taken from the request: self-registration always yields USER.
        const user = await db.user.create({
          data: { name, email, passwordHash, role: 'USER' },
          select: publicUserFields,
        });
        return { user, ...tokens.issue(user) };
      } catch (error) {
        // Relying on the unique index (not a prior SELECT) also covers concurrent sign-ups.
        if (isUniqueViolation(error)) {
          throw conflict('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists');
        }
        throw error;
      }
    },

    async login({ email, password }) {
      const record = await db.user.findUnique({ where: { email } });
      if (!record) {
        await verifyPassword(await (dummyHash ??= hashPassword(randomUUID())), password);
        throw invalidCredentials();
      }
      if (!(await verifyPassword(record.passwordHash, password))) {
        throw invalidCredentials();
      }

      const user: PublicUser = {
        id: record.id,
        name: record.name,
        email: record.email,
        role: record.role,
        createdAt: record.createdAt,
      };
      return { user, ...tokens.issue(user) };
    },

    findUser(id) {
      return db.user.findUnique({ where: { id }, select: publicUserFields });
    },
  };
}
