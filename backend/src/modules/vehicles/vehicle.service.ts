import type { Database } from '../../db/client.js';
import { notFound } from '../../errors/app-error.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { toVehicleDto, type VehicleDto } from './vehicle.dto.js';
import type {
  CreateVehicleInput,
  ListVehiclesQuery,
  SortOption,
  VehicleSearchCriteria,
} from './vehicle.schemas.js';

export const vehicleNotFound = () => notFound('VEHICLE_NOT_FOUND', 'Vehicle not found');

export interface Page<T> {
  data: T[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface VehicleService {
  create(input: CreateVehicleInput): Promise<VehicleDto>;
  getById(id: string): Promise<VehicleDto>;
  search(criteria: VehicleSearchCriteria | ListVehiclesQuery): Promise<Page<VehicleDto>>;
}

// Every ordering ends with the primary key so pages are stable when values tie.
const ORDER_BY: Record<SortOption, Prisma.VehicleOrderByWithRelationInput[]> = {
  newest: [{ createdAt: 'desc' }, { id: 'asc' }],
  price_asc: [{ price: 'asc' }, { id: 'asc' }],
  price_desc: [{ price: 'desc' }, { id: 'asc' }],
  make_asc: [{ make: 'asc' }, { model: 'asc' }, { id: 'asc' }],
  year_desc: [{ year: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }],
};

const MAX_SEARCH_TERMS = 5;

/**
 * Prisma passes `contains` values to ILIKE without escaping, so `%` or `_` typed
 * by a user would act as wildcards (searching "%" returned every vehicle).
 * Escaping them, and the escape character itself, keeps the search literal.
 */
const escapeLikePattern = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

const containsIgnoringCase = (value: string) => ({
  contains: escapeLikePattern(value),
  mode: 'insensitive' as const,
});

/**
 * Translates validated search criteria into a Prisma filter. Prisma sends every
 * value as a bound parameter, so user input never becomes part of the SQL text.
 */
function buildWhere(criteria: Partial<VehicleSearchCriteria>): Prisma.VehicleWhereInput {
  const where: Prisma.VehicleWhereInput = {};

  // Each word must match make or model, so "toyota cam" finds the Toyota Camry.
  const terms = criteria.q?.split(/\s+/).filter(Boolean).slice(0, MAX_SEARCH_TERMS) ?? [];
  if (terms.length > 0) {
    where.AND = terms.map((term) => ({
      OR: [{ make: containsIgnoringCase(term) }, { model: containsIgnoringCase(term) }],
    }));
  }
  if (criteria.make) where.make = containsIgnoringCase(criteria.make);
  if (criteria.model) where.model = containsIgnoringCase(criteria.model);
  if (criteria.category) where.category = criteria.category;
  if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
    where.price = { gte: criteria.minPrice, lte: criteria.maxPrice };
  }
  if (criteria.inStock !== undefined) {
    where.quantity = criteria.inStock ? { gt: 0 } : 0;
  }

  return where;
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

    async search(criteria) {
      const { page, pageSize, sort } = criteria;
      const where = buildWhere(criteria);

      // Count and page are read in one transaction so the total matches the rows.
      const [total, vehicles] = await db.$transaction([
        db.vehicle.count({ where }),
        db.vehicle.findMany({
          where,
          orderBy: ORDER_BY[sort],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ]);

      return {
        data: vehicles.map(toVehicleDto),
        meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      };
    },
  };
}
