import { z } from 'zod';

/** Emails are compared and stored trimmed and lower-cased. */
const email = z
  .string('Email is required')
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254, 'Email is too long'));

export const registerSchema = z.object({
  name: z
    .string('Name is required')
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  email,
  // Upper bound keeps hashing cost bounded; complexity rule is deliberately modest.
  password: z
    .string('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters')
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/\d/, 'Password must contain at least one number'),
});

export const loginSchema = z.object({
  email,
  password: z.string('Password is required').min(1, 'Password is required').max(128),
});

export type RegisterInput = z.output<typeof registerSchema>;
export type LoginInput = z.output<typeof loginSchema>;
