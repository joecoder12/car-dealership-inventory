import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { PurchaseButton } from '../components/purchase/PurchaseButton';
import { Button } from '../components/ui/Button';
import { PageSpinner } from '../components/ui/Spinner';
import { buttonClasses } from '../components/ui/styles';
import { StockBadge } from '../components/vehicles/StockBadge';
import { VehicleVisual } from '../components/vehicles/VehicleCard';
import { useAuth } from '../hooks/useAuth';
import { useVehicle } from '../hooks/useVehicles';
import { categoryLabel, formatPrice, fuelLabel } from '../lib/format';
import { ApiError } from '../services/api-client';

function Message({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-semibold text-ink-950">{title}</h1>
      <p className="mt-3 text-ink-500">{body}</p>
      <div className="mt-8 flex justify-center gap-3">
        {action}
        <Link to="/" className={buttonClasses('dark')}>
          Back to showroom
        </Link>
      </div>
    </div>
  );
}

export function VehicleDetailPage() {
  const { id = '' } = useParams();
  const { isAdmin } = useAuth();
  const { data: vehicle, isPending, isError, error, refetch } = useVehicle(id);

  if (isPending) return <PageSpinner label="Loading vehicle" />;
  if (isError) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) {
      return (
        <Message
          title="Vehicle not found"
          body="This vehicle may have been sold or removed from our inventory."
        />
      );
    }
    return (
      <Message
        title="We couldn’t load this vehicle"
        body={error.message}
        action={
          <Button variant="secondary" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  const specs = [
    { label: 'Body style', value: categoryLabel(vehicle.category) },
    { label: 'Model year', value: vehicle.year?.toString() ?? '—' },
    { label: 'Fuel', value: vehicle.fuelType ? fuelLabel(vehicle.fuelType) : '—' },
    { label: 'Make', value: vehicle.make },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <Link
        to="/"
        className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-ink-600 hover:text-ink-950"
      >
        <span aria-hidden="true">←</span> Back to showroom
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
        <div className="overflow-hidden rounded-3xl shadow-card ring-1 ring-ink-900/5">
          <VehicleVisual vehicle={vehicle} className="aspect-[16/10] w-full" />
        </div>

        <div className="flex flex-col">
          <p className="text-xs font-semibold tracking-[0.18em] text-ember-700 uppercase">
            {categoryLabel(vehicle.category)}
            {vehicle.year ? ` · ${vehicle.year}` : ''}
          </p>
          <h1 className="mt-3 text-3xl leading-tight font-semibold text-ink-950 sm:text-4xl">
            <span className="block text-lg font-medium text-ink-500 sm:text-xl">
              {vehicle.make}
            </span>{' '}
            {vehicle.model}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <p className="font-display text-3xl font-semibold text-ink-950">
              {formatPrice(vehicle.price)}
            </p>
            <StockBadge quantity={vehicle.quantity} />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <PurchaseButton vehicle={vehicle} size="lg" className="sm:flex-1" />
            {isAdmin && (
              <Link
                to={`/admin/vehicles/${vehicle.id}/edit`}
                className={`${buttonClasses('secondary', 'lg')} sm:flex-1`}
              >
                Edit details
              </Link>
            )}
          </div>

          <ul
            aria-label="Specifications"
            className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-ink-100 ring-1 ring-ink-100"
          >
            {specs.map((spec) => (
              <li key={spec.label} className="bg-white p-4">
                <span className="block text-xs text-ink-500">{spec.label}</span>
                <span className="mt-1 block font-medium text-ink-900">{spec.value}</span>
              </li>
            ))}
          </ul>

          {vehicle.description && (
            <section className="mt-8">
              <h2 className="text-sm font-semibold text-ink-900">About this vehicle</h2>
              <p className="mt-2 leading-relaxed text-ink-600">{vehicle.description}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
