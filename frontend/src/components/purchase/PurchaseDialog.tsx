import { useState } from 'react';
import { usePurchaseVehicle } from '../../hooks/useInventoryMutations';
import { formatPrice, vehicleName, vehicleSpecs } from '../../lib/format';
import type { Vehicle } from '../../types/models';
import { useToast } from '../toast/ToastProvider';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { inputClasses } from '../ui/styles';
import { VehicleArt } from '../vehicles/VehicleArt';

/** Same per-request cap as the API. */
export const MAX_UNITS_PER_PURCHASE = 5;

const newIdempotencyKey = () => crypto.randomUUID();

/**
 * Confirmation step before buying. One Idempotency-Key is generated per
 * intended purchase and reused for retries, so a double click or a retry after
 * a lost response can never buy twice. Choosing a different quantity is a
 * different purchase and gets a new key.
 */
export function PurchaseDialog({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const toast = useToast();
  const purchase = usePurchaseVehicle();
  const [quantity, setQuantity] = useState(1);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);

  const maxQuantity = Math.min(MAX_UNITS_PER_PURCHASE, vehicle.quantity);
  const soldOut = maxQuantity < 1;
  const name = vehicleName(vehicle);

  const confirm = () => {
    purchase.mutate(
      { id: vehicle.id, quantity, idempotencyKey },
      {
        onSuccess: ({ purchase: receipt, vehicle: updated }) => {
          const remaining = updated?.quantity ?? 0;
          toast.success(
            `Purchase confirmed: ${receipt.quantity} × ${name}. ${
              remaining === 0 ? 'That was the last one!' : `${remaining} left in stock.`
            }`,
          );
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      title="Confirm purchase"
      description="Stock is reserved for you the moment you confirm."
      onClose={onClose}
      dismissible={!purchase.isPending}
    >
      <div className="flex items-center gap-4 rounded-2xl bg-ink-50 p-3">
        <VehicleArt vehicle={vehicle} className="h-16 w-28 shrink-0" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink-950">{name}</p>
          <p className="text-sm text-ink-500">{vehicleSpecs(vehicle)}</p>
        </div>
      </div>

      <dl className="mt-6 space-y-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-600">Unit price</dt>
          <dd className="font-medium text-ink-900">{formatPrice(vehicle.price)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt>
            <label htmlFor="purchase-quantity" className="text-ink-600">
              Quantity
            </label>
          </dt>
          <dd>
            <select
              id="purchase-quantity"
              value={quantity}
              disabled={soldOut || purchase.isPending}
              onChange={(event) => {
                setQuantity(Number(event.target.value));
                setIdempotencyKey(newIdempotencyKey());
              }}
              className={`${inputClasses(false)} w-24`}
            >
              {Array.from({ length: Math.max(maxQuantity, 0) }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  {index + 1}
                </option>
              ))}
            </select>
          </dd>
        </div>
        <div className="flex items-center justify-between border-t border-ink-100 pt-4">
          <dt className="font-semibold text-ink-900">Total</dt>
          <dd
            data-testid="purchase-total"
            className="font-display text-2xl font-semibold text-ink-950"
          >
            {formatPrice(vehicle.price * quantity)}
          </dd>
        </div>
      </dl>

      {soldOut && !purchase.isError && (
        <p className="mt-5 text-sm font-medium text-rose-700">This vehicle has just sold out.</p>
      )}
      {purchase.isError && <Alert className="mt-5">{purchase.error.message}</Alert>}

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={purchase.isPending}>
          Cancel
        </Button>
        <Button variant="primary" onClick={confirm} loading={purchase.isPending} disabled={soldOut}>
          Confirm purchase
        </Button>
      </div>
    </Modal>
  );
}
