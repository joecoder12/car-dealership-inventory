import type { Database } from '../../db/client.js';
import { notFound } from '../../errors/app-error.js';
import { toVehicleDto, type VehicleDto } from './vehicle.dto.js';
import type { CreateVehicleInput } from './vehicle.schemas.js';

export const vehicleNotFound = () => notFound('VEHICLE_NOT_FOUND', 'Vehicle not found');

export interface VehicleService {
  create(input: CreateVehicleInput): Promise<VehicleDto>;
  getById(id: string): Promise<VehicleDto>;
}

/** Catalogue management. Stock movements live in the inventory module. */
export function createVehicleService(db: Database): VehicleService {
  return {
    async create(input) {
      const vehicle = await db.vehicle.create({
        data: { ...input, price: input.price.toFixed(2) },
      });
      return toVehicleDto(vehicle);
    },

    async getById(id) {
      const vehicle = await db.vehicle.findUnique({ where: { id } });
      if (!vehicle) throw vehicleNotFound();
      return toVehicleDto(vehicle);
    },
  };
}
