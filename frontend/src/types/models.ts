/** Shapes returned by the backend API (see README "API reference"). */

export type Role = 'USER' | 'ADMIN';

export const VEHICLE_CATEGORIES = [
  'SEDAN',
  'SUV',
  'TRUCK',
  'COUPE',
  'CONVERTIBLE',
  'HATCHBACK',
  'WAGON',
  'VAN',
] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export const FUEL_TYPES = ['PETROL', 'DIESEL', 'HYBRID', 'ELECTRIC'] as const;
export type FuelType = (typeof FUEL_TYPES)[number];

export const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'make_asc', 'year_desc'] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
}

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  category: VehicleCategory;
  price: number;
  quantity: number;
  year: number | null;
  fuelType: FuelType | null;
  description: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PageMeta;
}

export interface Purchase {
  id: string;
  vehicleId: string | null;
  vehicleMake: string;
  vehicleModel: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: string;
}

export interface InventorySummary {
  vehicleCount: number;
  totalUnits: number;
  outOfStockCount: number;
  lowStockCount: number;
  lowStockThreshold: number;
  inventoryValue: number;
}

export interface VehicleFilters {
  q?: string;
  make?: string;
  model?: string;
  category?: VehicleCategory;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface VehicleDetailsInput {
  make: string;
  model: string;
  category: VehicleCategory;
  price: number;
  year: number | null;
  fuelType: FuelType | null;
  description: string | null;
  imageUrl: string | null;
}

export interface NewVehicleInput extends VehicleDetailsInput {
  quantity: number;
}
