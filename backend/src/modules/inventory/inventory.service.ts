import type { Database } from '../../db/client.js';
import { AppError, conflict } from '../../errors/app-error.js';
import { toVehicleDto, type VehicleDto } from '../vehicles/vehicle.dto.js';
import { vehicleNotFound } from '../vehicles/vehicle.service.js';
import { LOW_STOCK_THRESHOLD, MAX_STOCK_PER_VEHICLE } from './inventory.schemas.js';
import { toPurchaseDto, type PurchaseDto } from './purchase.dto.js';

export interface PurchaseRequest {
  userId: string;
  vehicleId: string;
  quantity: number;
  idempotencyKey?: string;
}

export interface PurchaseResult {
  purchase: PurchaseDto;
  /** Current state of the vehicle; null only if it was deleted after a replayed purchase. */
  vehicle: VehicleDto | null;
  /** True when an earlier purchase with the same Idempotency-Key was returned. */
  replayed: boolean;
}

export interface InventorySummary {
  vehicleCount: number;
  totalUnits: number;
  outOfStockCount: number;
  lowStockCount: number;
  lowStockThreshold: number;
  inventoryValue: number;
}

export interface InventoryService {
  purchase(request: PurchaseRequest): Promise<PurchaseResult>;
  restock(vehicleId: string, quantity: number): Promise<VehicleDto>;
  summary(): Promise<InventorySummary>;
}

const insufficientStock = (available: number, requested: number) =>
  conflict(
    'INSUFFICIENT_STOCK',
    `Only ${available} unit(s) in stock; cannot purchase ${requested}`,
  );

// Generous limits: purchases normally wait on a row lock for milliseconds.
const TRANSACTION_OPTIONS = { maxWait: 5_000, timeout: 10_000 };

export function createInventoryService(db: Database): InventoryService {
  /** Returns the earlier result for a repeated Idempotency-Key, if there is one. */
  async function findReplay(request: PurchaseRequest): Promise<PurchaseResult | null> {
    if (!request.idempotencyKey) return null;

    const existing = await db.purchase.findUnique({
      where: {
        userId_idempotencyKey: { userId: request.userId, idempotencyKey: request.idempotencyKey },
      },
      include: { vehicle: true },
    });
    if (!existing) return null;

    if (existing.vehicleId !== request.vehicleId || existing.quantity !== request.quantity) {
      throw new AppError(
        422,
        'IDEMPOTENCY_KEY_REUSED',
        'This Idempotency-Key was already used for a different purchase',
      );
    }
    return {
      purchase: toPurchaseDto(existing),
      vehicle: existing.vehicle ? toVehicleDto(existing.vehicle) : null,
      replayed: true,
    };
  }

  return {
    /**
     * Sells units atomically. The decrement is a single conditional UPDATE
     * (`... SET quantity = quantity - n WHERE id = $1 AND quantity >= n`).
     * PostgreSQL row-locks the vehicle, and a concurrent buyer's UPDATE re-checks
     * the condition after the lock is released, so the last unit can only be
     * sold once and stock can never go negative (the CHECK constraint backs
     * this up). The audit record is written in the same transaction, so if it
     * fails the decrement is rolled back too.
     */
    async purchase(request) {
      const replay = await findReplay(request);
      if (replay) return replay;

      const { userId, vehicleId, quantity, idempotencyKey } = request;
      try {
        return await db.$transaction(async (tx) => {
          const { count } = await tx.vehicle.updateMany({
            where: { id: vehicleId, quantity: { gte: quantity } },
            data: { quantity: { decrement: quantity } },
          });

          if (count === 0) {
            const current = await tx.vehicle.findUnique({
              where: { id: vehicleId },
              select: { quantity: true },
            });
            if (!current) throw vehicleNotFound();
            throw insufficientStock(current.quantity, quantity);
          }

          // We hold the row lock until commit, so this read sees exactly our update.
          const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
          const purchase = await tx.purchase.create({
            data: {
              userId,
              vehicleId,
              vehicleMake: vehicle.make,
              vehicleModel: vehicle.model,
              quantity,
              unitPrice: vehicle.price,
              totalPrice: vehicle.price.mul(quantity),
              idempotencyKey,
            },
          });

          return {
            purchase: toPurchaseDto(purchase),
            vehicle: toVehicleDto(vehicle),
            replayed: false,
          };
        }, TRANSACTION_OPTIONS);
      } catch (error) {
        // A concurrent request with the same key may have committed first. Ours
        // then failed (duplicate key, or the stock it bought is gone) and was
        // rolled back, so the correct answer is the winner's result.
        const concurrentReplay = await findReplay(request);
        if (concurrentReplay) return concurrentReplay;
        throw error;
      }
    },

    /** Adds stock with an atomic increment, guarded by the per-vehicle ceiling. */
    async restock(vehicleId, quantity) {
      return db.$transaction(async (tx) => {
        const { count } = await tx.vehicle.updateMany({
          where: { id: vehicleId, quantity: { lte: MAX_STOCK_PER_VEHICLE - quantity } },
          data: { quantity: { increment: quantity } },
        });

        if (count === 0) {
          const exists = await tx.vehicle.findUnique({
            where: { id: vehicleId },
            select: { id: true },
          });
          if (!exists) throw vehicleNotFound();
          throw conflict(
            'STOCK_LIMIT_EXCEEDED',
            `Restocking would exceed the maximum of ${MAX_STOCK_PER_VEHICLE} units for one vehicle`,
          );
        }

        return toVehicleDto(await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } }));
      }, TRANSACTION_OPTIONS);
    },

    async summary() {
      const [row] = await db.$queryRaw<
        Array<
          Omit<InventorySummary, 'inventoryValue' | 'lowStockThreshold'> & {
            inventoryValue: string;
          }
        >
      >`
        SELECT COUNT(*)::int                                                         AS "vehicleCount",
               COALESCE(SUM(quantity), 0)::int                                       AS "totalUnits",
               COUNT(*) FILTER (WHERE quantity = 0)::int                             AS "outOfStockCount",
               COUNT(*) FILTER (WHERE quantity BETWEEN 1 AND ${LOW_STOCK_THRESHOLD})::int AS "lowStockCount",
               COALESCE(SUM(price * quantity), 0)::text                              AS "inventoryValue"
        FROM vehicles`;

      return {
        vehicleCount: row?.vehicleCount ?? 0,
        totalUnits: row?.totalUnits ?? 0,
        outOfStockCount: row?.outOfStockCount ?? 0,
        lowStockCount: row?.lowStockCount ?? 0,
        lowStockThreshold: LOW_STOCK_THRESHOLD,
        inventoryValue: Number(row?.inventoryValue ?? 0),
      };
    },
  };
}
