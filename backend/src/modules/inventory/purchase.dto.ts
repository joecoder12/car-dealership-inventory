import type { Purchase } from '../../generated/prisma/client.js';

export interface PurchaseDto {
  id: string;
  vehicleId: string | null;
  vehicleMake: string;
  vehicleModel: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  createdAt: Date;
}

export function toPurchaseDto(purchase: Purchase): PurchaseDto {
  return {
    id: purchase.id,
    vehicleId: purchase.vehicleId,
    vehicleMake: purchase.vehicleMake,
    vehicleModel: purchase.vehicleModel,
    quantity: purchase.quantity,
    unitPrice: purchase.unitPrice.toNumber(),
    totalPrice: purchase.totalPrice.toNumber(),
    createdAt: purchase.createdAt,
  };
}
