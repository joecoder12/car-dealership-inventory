import type { Database } from '../db/client.js';
import { registerSchema } from '../modules/auth/auth.schemas.js';
import { hashPassword } from '../modules/auth/password.js';

export interface AdminInput {
  name: string;
  email: string;
  password: string;
}

/**
 * The only way to obtain ADMIN access: an operator runs this from a trusted
 * shell (see `npm run admin:create`). Public registration always creates USERs.
 * An existing account is promoted and keeps its current password.
 */
export async function ensureAdmin(
  db: Database,
  input: AdminInput,
): Promise<{ status: 'created' | 'promoted'; email: string }> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Invalid admin details - ${problems.join('; ')}`);
  }
  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    return { status: 'promoted', email };
  }

  await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role: 'ADMIN' },
  });
  return { status: 'created', email };
}
