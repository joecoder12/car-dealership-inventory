import { z } from 'zod';

/*
 * Client-side copies of the API's validation rules, with the same messages, so
 * users get instant feedback. The server stays authoritative: its 400 details
 * are mapped onto the same fields when they disagree.
 */

const email = z
  .string()
  .trim()
  .min(1, 'Enter a valid email address')
  .pipe(z.email('Enter a valid email address').max(254, 'Email is too long'));

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
});

export const PASSWORD_HINT = 'At least 8 characters, including a letter and a number.';

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  email,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export type FieldErrors<T> = Partial<Record<keyof T & string, string>>;

/** Validates form values, returning parsed data or the first message per field. */
export function validate<Schema extends z.ZodType>(
  schema: Schema,
  values: unknown,
): { success: true; data: z.output<Schema> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(values);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const field = issue.path.join('.');
    errors[field] ??= issue.message;
  }
  return { success: false, errors };
}
