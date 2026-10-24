/** Class-name helpers shared by components that look like buttons or inputs. */

const VARIANTS = {
  primary:
    'bg-ember-600 text-white shadow-sm hover:bg-ember-700 disabled:bg-ink-200 disabled:text-ink-500',
  dark: 'bg-ink-950 text-white shadow-sm hover:bg-ink-800 disabled:bg-ink-200 disabled:text-ink-500',
  secondary:
    'bg-white text-ink-900 ring-1 ring-inset ring-ink-200 hover:bg-ink-50 hover:ring-ink-300 disabled:text-ink-400',
  ghost: 'text-ink-700 hover:bg-ink-100 disabled:text-ink-400',
  danger:
    'bg-rose-700 text-white shadow-sm hover:bg-rose-800 disabled:bg-ink-200 disabled:text-ink-500',
} as const;

const SIZES = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
} as const;

export type ButtonVariant = keyof typeof VARIANTS;
export type ButtonSize = keyof typeof SIZES;

export const buttonClasses = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md') =>
  `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]}`;

export const inputClasses = (invalid: boolean) =>
  `block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-ink-900 shadow-xs ring-1 ring-inset placeholder:text-ink-400 focus:outline-none focus:ring-2 disabled:bg-ink-50 disabled:text-ink-500 ${
    invalid ? 'ring-rose-400 focus:ring-rose-500' : 'ring-ink-200 focus:ring-ember-500'
  }`;
