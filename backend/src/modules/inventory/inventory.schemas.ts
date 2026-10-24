import { z } from 'zod';
import { MAX_STOCK_PER_VEHICLE } from '../vehicles/vehicle.schemas.js';

export const MAX_UNITS_PER_PURCHASE = 5;
export const MAX_RESTOCK_PER_REQUEST = 1_000;
export const LOW_STOCK_THRESHOLD = 3;
export { MAX_STOCK_PER_VEHICLE };

/** The body is optional: an empty purchase request buys a single unit. */
export const purchaseBodySchema = z.preprocess(
  (body) => body ?? {},
  z.object({
    quantity: z
      .number('Quantity must be a number')
      .int('Quantity must be a whole number')
      .min(1, 'Quantity must be at least 1')
      .max(MAX_UNITS_PER_PURCHASE, `You can buy at most ${MAX_UNITS_PER_PURCHASE} units at once`)
      .default(1),
  }),
);

export const purchaseHeadersSchema = z.object({
  'Idempotency-Key': z
    .string()
    .regex(
      /^[A-Za-z0-9_-]{8,100}$/,
      'Idempotency-Key must be 8-100 characters of letters, digits, "-" or "_"',
    )
    .optional(),
});

export const restockBodySchema = z.object({
  quantity: z
    .number('Quantity is required')
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1')
    .max(
      MAX_RESTOCK_PER_REQUEST,
      `You can restock at most ${MAX_RESTOCK_PER_REQUEST} units at once`,
    ),
});
