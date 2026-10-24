import { useState, type FormEvent } from 'react';
import { useRestockVehicle } from '../../hooks/useInventoryMutations';
import { vehicleName } from '../../lib/format';
import type { Vehicle } from '../../types/models';
import { useToast } from '../toast/ToastProvider';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { TextField } from '../ui/TextField';

/** Same per-request cap as the API. */
const MAX_RESTOCK = 1000;

export function RestockDialog({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const toast = useToast();
  const restock = useRestockVehicle();
  const [amount, setAmount] = useState('1');
  const [error, setError] = useState<string>();
  const name = vehicleName(vehicle);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const quantity = Number(amount);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_RESTOCK) {
      setError(`Enter a whole number from 1 to ${MAX_RESTOCK}.`);
      return;
    }
    setError(undefined);
    restock.mutate(
      { id: vehicle.id, quantity },
      {
        onSuccess: (updated) => {
          toast.success(
            `Added ${quantity} ${quantity === 1 ? 'unit' : 'units'} to ${name}. ${updated.quantity} now in stock.`,
          );
          onClose();
        },
      },
    );
  };

  return (
    <Modal
      title={`Restock ${name}`}
      description={`Currently ${vehicle.quantity} in stock.`}
      onClose={onClose}
      dismissible={!restock.isPending}
    >
      <form onSubmit={submit} noValidate className="space-y-5">
        <TextField
          label="Units to add"
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_RESTOCK}
          step={1}
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={error}
          hint={`Stock after restocking: ${vehicle.quantity + (Number(amount) || 0)}`}
        />
        {restock.isError && <Alert>{restock.error.message}</Alert>}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={restock.isPending}>
            Cancel
          </Button>
          <Button type="submit" variant="dark" loading={restock.isPending}>
            Add stock
          </Button>
        </div>
      </form>
    </Modal>
  );
}
