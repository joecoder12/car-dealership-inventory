import { z } from 'zod';
import { FuelType, VehicleCategory } from '../../generated/prisma/enums.js';

export const MAX_PRICE = 99_999_999.99;
export const MAX_STOCK_PER_VEHICLE = 10_000;
const FIRST_CAR_YEAR = 1886;

const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;

/** Turns "", null and undefined into null so optional columns are cleared consistently. */
const optional = <T extends z.ZodType>(schema: T) =>
  z
    .preprocess((value) => (value === '' ? null : value), schema.nullish())
    .transform((value) => value ?? null);

export const idParamsSchema = z.object({ id: z.uuid('Vehicle id must be a UUID') });

const vehicleDetailsShape = {
  make: z
    .string('Make is required')
    .trim()
    .min(1, 'Make is required')
    .max(60, 'Make must be at most 60 characters'),
  model: z
    .string('Model is required')
    .trim()
    .min(1, 'Model is required')
    .max(80, 'Model must be at most 80 characters'),
  category: z.enum(VehicleCategory, 'Category must be one of the supported categories'),
  // Money arrives as a JSON number and is stored as numeric(10,2), never a float.
  price: z
    .number('Price must be a number')
    .positive('Price must be greater than 0')
    .max(MAX_PRICE, 'Price is too large')
    .refine(hasAtMostTwoDecimals, 'Price can have at most 2 decimal places'),
  year: optional(
    z
      .number('Year must be a number')
      .int('Year must be a whole number')
      .min(FIRST_CAR_YEAR, `Year must be ${FIRST_CAR_YEAR} or later`)
      .refine((year) => year <= new Date().getFullYear() + 1, 'Year cannot be beyond next year'),
  ),
  fuelType: optional(z.enum(FuelType, 'Fuel type must be one of the supported fuel types')),
  description: optional(z.string().trim().max(2000, 'Description must be at most 2000 characters')),
  imageUrl: optional(
    z
      .url({ protocol: /^https$/, error: 'Image URL must be an https:// URL' })
      .max(2048, 'Image URL is too long'),
  ),
};

export const createVehicleSchema = z.object({
  ...vehicleDetailsShape,
  quantity: z
    .number('Quantity is required')
    .int('Quantity must be a whole number')
    .min(0, 'Quantity cannot be negative')
    .max(MAX_STOCK_PER_VEHICLE, `Quantity cannot exceed ${MAX_STOCK_PER_VEHICLE}`),
});

export type CreateVehicleInput = z.output<typeof createVehicleSchema>;

export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'make_asc', 'year_desc'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];
export const MAX_PAGE_SIZE = 50;

/** Blank query parameters (e.g. `?make=` from an empty form field) mean "no filter". */
const withoutBlankParams = (query: unknown) =>
  typeof query === 'object' && query !== null
    ? Object.fromEntries(Object.entries(query).filter(([, value]) => value !== ''))
    : query;

const paginationShape = {
  page: z.coerce.number('page must be a number').int().min(1, 'page must be 1 or more').default(1),
  pageSize: z.coerce
    .number('pageSize must be a number')
    .int()
    .min(1, 'pageSize must be 1 or more')
    .max(MAX_PAGE_SIZE, `pageSize must be at most ${MAX_PAGE_SIZE}`)
    .default(12),
  sort: z.enum(SORT_OPTIONS, `sort must be one of: ${SORT_OPTIONS.join(', ')}`).default('newest'),
};

const priceBound = (name: string) =>
  z.coerce
    .number(`${name} must be a number`)
    .min(0, `${name} cannot be negative`)
    .max(MAX_PRICE, `${name} is too large`)
    .optional();

export const listVehiclesQuerySchema = z.preprocess(withoutBlankParams, z.object(paginationShape));

export const searchVehiclesQuerySchema = z.preprocess(
  withoutBlankParams,
  z
    .object({
      ...paginationShape,
      q: z.string().trim().max(100, 'Search text is too long').optional(),
      make: z.string().trim().max(60).optional(),
      model: z.string().trim().max(80).optional(),
      category: z
        .enum(VehicleCategory, 'category must be one of the supported categories')
        .optional(),
      minPrice: priceBound('minPrice'),
      maxPrice: priceBound('maxPrice'),
      inStock: z
        .enum(['true', 'false'], 'inStock must be true or false')
        .transform((value) => value === 'true')
        .optional(),
    })
    .refine(
      ({ minPrice, maxPrice }) =>
        minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
      { path: ['maxPrice'], message: 'maxPrice must be greater than or equal to minPrice' },
    ),
);

export type VehicleSearchCriteria = z.output<typeof searchVehiclesQuerySchema>;
export type ListVehiclesQuery = z.output<typeof listVehiclesQuerySchema>;
