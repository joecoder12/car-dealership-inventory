import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { vehicleName } from '../../lib/format';
import type { Vehicle } from '../../types/models';
import { Button } from '../ui/Button';
import type { ButtonSize } from '../ui/styles';
import { PurchaseDialog } from './PurchaseDialog';

/**
 * Disabled when the vehicle is sold out (the API still refuses such purchases
 * on its own). Visitors are sent to sign in and brought back to the vehicle.
 */
export function PurchaseButton({
  vehicle,
  size = 'sm',
  className = '',
}: {
  vehicle: Vehicle;
  size?: ButtonSize;
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const start = () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/vehicles/${vehicle.id}`)}`);
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <Button
        variant="primary"
        size={size}
        disabled={vehicle.quantity <= 0}
        onClick={start}
        className={className}
        title={vehicle.quantity <= 0 ? 'This vehicle is sold out' : undefined}
      >
        Purchase <span className="sr-only">{vehicleName(vehicle)}</span>
      </Button>
      {open && <PurchaseDialog vehicle={vehicle} onClose={() => setOpen(false)} />}
    </>
  );
}
