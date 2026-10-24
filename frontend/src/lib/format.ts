import type { FuelType, SortOption, Vehicle, VehicleCategory } from '../types/models';

const CURRENCY = import.meta.env.VITE_CURRENCY ?? 'USD';

/** "$31,250" for whole amounts, "$63,900.50" when there are cents. */
export function formatPrice(amount: number): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(amount);
}

const CATEGORY_LABELS: Record<VehicleCategory, string> = {
  SEDAN: 'Sedan',
  SUV: 'SUV',
  TRUCK: 'Truck',
  COUPE: 'Coupe',
  CONVERTIBLE: 'Convertible',
  HATCHBACK: 'Hatchback',
  WAGON: 'Wagon',
  VAN: 'Van',
};

const FUEL_LABELS: Record<FuelType, string> = {
  PETROL: 'Petrol',
  DIESEL: 'Diesel',
  HYBRID: 'Hybrid',
  ELECTRIC: 'Electric',
};

export const categoryLabel = (category: VehicleCategory) => CATEGORY_LABELS[category];
export const fuelLabel = (fuelType: FuelType) => FUEL_LABELS[fuelType];

/** Matches the API's low-stock threshold used in the admin summary. */
export const LOW_STOCK_THRESHOLD = 3;

export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(quantity: number): StockLevel {
  if (quantity <= 0) return 'out';
  return quantity <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';
}

export function stockLabel(quantity: number): string {
  switch (stockLevel(quantity)) {
    case 'out':
      return 'Sold out';
    case 'low':
      return `Only ${quantity} left`;
    default:
      return `${quantity} in stock`;
  }
}

export const vehicleName = (vehicle: Pick<Vehicle, 'make' | 'model'>) =>
  `${vehicle.make} ${vehicle.model}`;

/** "2025 · Hybrid" — whichever optional attributes are known. */
export function vehicleSpecs(vehicle: Pick<Vehicle, 'year' | 'fuelType'>): string {
  return [vehicle.year, vehicle.fuelType ? fuelLabel(vehicle.fuelType) : null]
    .filter(Boolean)
    .join(' · ');
}

export const SORT_LABELS: Record<SortOption, string> = {
  newest: 'Newest arrivals',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
  make_asc: 'Make: A to Z',
  year_desc: 'Model year: newest',
};
