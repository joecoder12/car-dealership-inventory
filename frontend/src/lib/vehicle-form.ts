import { z } from 'zod';
import { FUEL_TYPES, VEHICLE_CATEGORIES, type Vehicle } from '../types/models';

/** Raw form state: every input holds a string until it is validated. */
export interface VehicleFormValues {
  make: string;
  model: string;
  category: string;
  price: string;
  quantity: string;
  year: string;
  fuelType: string;
  description: string;
  imageUrl: string;
}

export const emptyVehicleForm: VehicleFormValues = {
  make: '',
  model: '',
  category: '',
  price: '',
  quantity: '',
  year: '',
  fuelType: '',
  description: '',
  imageUrl: '',
};

export function toFormValues(vehicle: Vehicle): VehicleFormValues {
  return {
    make: vehicle.make,
    model: vehicle.model,
    category: vehicle.category,
    price: String(vehicle.price),
    quantity: String(vehicle.quantity),
    year: vehicle.year?.toString() ?? '',
    fuelType: vehicle.fuelType ?? '',
    description: vehicle.description ?? '',
    imageUrl: vehicle.imageUrl ?? '',
  };
}

const requiredNumber = (requiredMessage: string, typeMessage: string) =>
  z
    .string()
    .trim()
    .min(1, requiredMessage)
    .transform(Number)
    .pipe(z.number(typeMessage).refine(Number.isFinite, typeMessage));

const optionalText = (schema: z.ZodType<string, string>) =>
  z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .pipe(schema.nullable());

const details = {
  make: z.string().trim().min(1, 'Make is required').max(60, 'Make must be at most 60 characters'),
  model: z
    .string()
    .trim()
    .min(1, 'Model is required')
    .max(80, 'Model must be at most 80 characters'),
  category: z.enum(VEHICLE_CATEGORIES, 'Choose a category'),
  price: requiredNumber('Price is required', 'Price must be a number').pipe(
    z
      .number()
      .positive('Price must be greater than 0')
      .max(99_999_999.99, 'Price is too large')
      .refine(
        (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-6,
        'Price can have at most 2 decimal places',
      ),
  ),
  year: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number(value)))
    .pipe(
      z
        .number('Year must be a number')
        .int('Year must be a whole number')
        .min(1886, 'Year must be 1886 or later')
        .max(new Date().getFullYear() + 1, 'Year cannot be beyond next year')
        .nullable(),
    ),
  fuelType: z
    .string()
    .transform((value) => (value === '' ? null : value))
    .pipe(z.enum(FUEL_TYPES).nullable()),
  description: optionalText(z.string().max(2000, 'Description must be at most 2000 characters')),
  imageUrl: optionalText(
    z
      .url({ protocol: /^https$/, error: 'Image URL must be an https:// URL' })
      .max(2048, 'Image URL is too long'),
  ),
};

/** Mirrors the API's PUT body: descriptive details only, never stock. */
export const vehicleDetailsFormSchema = z.object(details);

/** Mirrors the API's POST body: details plus the initial stock level. */
export const newVehicleFormSchema = z.object({
  ...details,
  quantity: requiredNumber('Initial stock is required', 'Stock must be a number').pipe(
    z
      .number()
      .int('Stock must be a whole number')
      .min(0, 'Stock cannot be negative')
      .max(10_000, 'Stock cannot exceed 10000'),
  ),
});
