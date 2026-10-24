import { useDeleteVehicle } from '../../hooks/useInventoryMutations';
import { vehicleName } from '../../lib/format';
import type { Vehicle } from '../../types/models';
import { useToast } from '../toast/ToastProvider';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

export function DeleteVehicleDialog({
  vehicle,
  onClose,
  onDeleted,
}: {
  vehicle: Vehicle;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const toast = useToast();
  const remove = useDeleteVehicle();
  const name = vehicleName(vehicle);

  const confirm = () =>
    remove.mutate(vehicle.id, {
      onSuccess: () => {
        toast.success(`${name} was deleted.`);
        onClose();
        onDeleted?.();
      },
    });

  return (
    <Modal
      title={`Delete ${name}?`}
      description="It will be removed from the showroom immediately. Past purchase records are kept. This cannot be undone."
      onClose={onClose}
      dismissible={!remove.isPending}
    >
      {remove.isError && <Alert className="mb-5">{remove.error.message}</Alert>}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={remove.isPending}>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} loading={remove.isPending}>
          Delete vehicle
        </Button>
      </div>
    </Modal>
  );
}
