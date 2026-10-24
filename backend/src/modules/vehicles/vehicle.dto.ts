import type { Vehicle } from '../../generated/prisma/client.js';
import type { FuelType, VehicleCategory } from '../../generated/prisma/enums.js';

/** The public JSON shape of a vehicle. Prices leave the API as plain numbers. */
export interface VehicleDto {
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
  createdAt: Date;
  updatedAt: Date;
}

export function toVehicleDto(vehicle: Vehicle): VehicleDto {
  return {
    id: vehicle.id,
    make: vehicle.make,
    model: vehicle.model,
    category: vehicle.category,
    price: vehicle.price.toNumber(),
    quantity: vehicle.quantity,
    year: vehicle.year,
    fuelType: vehicle.fuelType,
    description: vehicle.description,
    imageUrl: vehicle.imageUrl,
    createdAt: vehicle.createdAt,
    updatedAt: vehicle.updatedAt,
  };
}
