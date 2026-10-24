import { useId, type ReactNode } from 'react';
import { Link } from 'react-router';
import { categoryLabel, formatPrice, vehicleSpecs } from '../../lib/format';
import type { Vehicle } from '../../types/models';
import { StockBadge } from './StockBadge';
import { VehicleArt } from './VehicleArt';

/** Backdrop tint per body style keeps the grid varied without real photography. */
const BACKDROPS: Record<Vehicle['category'], string> = {
  SEDAN: 'from-slate-100 to-slate-200/70',
  SUV: 'from-stone-100 to-stone-200/70',
  TRUCK: 'from-amber-50 to-orange-100/70',
  COUPE: 'from-zinc-100 to-zinc-200/70',
  CONVERTIBLE: 'from-sky-50 to-sky-100/80',
  HATCHBACK: 'from-neutral-100 to-neutral-200/70',
  WAGON: 'from-emerald-50 to-teal-100/60',
  VAN: 'from-indigo-50 to-indigo-100/60',
};

export function VehicleVisual({
  vehicle,
  className = '',
}: {
  vehicle: Vehicle;
  className?: string;
}) {
  return (
    <div className={`bg-gradient-to-b ${BACKDROPS[vehicle.category]} ${className}`}>
      {vehicle.imageUrl ? (
        <img
          src={vehicle.imageUrl}
          alt={`${vehicle.make} ${vehicle.model}`}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <VehicleArt vehicle={vehicle} className="h-full w-full px-6 pt-6 pb-2" />
      )}
    </div>
  );
}

export function VehicleCard({ vehicle, action }: { vehicle: Vehicle; action?: ReactNode }) {
  const headingId = useId();
  const href = `/vehicles/${vehicle.id}`;

  return (
    <article
      aria-labelledby={headingId}
      className="group flex animate-fade-up flex-col overflow-hidden rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5 transition duration-200 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <Link to={href} tabIndex={-1} aria-hidden="true" className="relative block aspect-[16/10]">
        <VehicleVisual vehicle={vehicle} className="h-full w-full" />
        <span className="absolute top-3 left-3 rounded-full bg-white/85 px-2.5 py-1 text-xs font-semibold text-ink-700 ring-1 ring-ink-900/5 backdrop-blur">
          {categoryLabel(vehicle.category)}
        </span>
        <StockBadge quantity={vehicle.quantity} className="absolute top-3 right-3" />
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <p
          aria-hidden="true"
          className="text-xs font-semibold tracking-[0.14em] text-ink-500 uppercase"
        >
          {vehicle.make}
        </p>
        <h3 id={headingId} className="mt-1 text-lg leading-snug font-semibold text-ink-950">
          <Link to={href} className="rounded hover:text-ember-700">
            {/* The make is shown above as an eyebrow; repeat it for assistive tech.
                The separating space must sit outside the span or it is trimmed. */}
            <span className="sr-only">{vehicle.make}</span> {vehicle.model}
          </Link>
        </h3>
        {vehicleSpecs(vehicle) && (
          <p className="mt-1 text-sm text-ink-500">{vehicleSpecs(vehicle)}</p>
        )}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="text-xs text-ink-500">Price</p>
            <p className="font-display text-xl font-semibold text-ink-950">
              {formatPrice(vehicle.price)}
            </p>
          </div>
          {action}
        </div>
      </div>
    </article>
  );
}

export function VehicleCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-ink-900/5" aria-hidden="true">
      <div className="aspect-[16/10] animate-pulse bg-ink-100" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-16 animate-pulse rounded bg-ink-100" />
        <div className="h-5 w-40 animate-pulse rounded bg-ink-100" />
        <div className="h-4 w-24 animate-pulse rounded bg-ink-100" />
        <div className="h-9 w-full animate-pulse rounded-xl bg-ink-100" />
      </div>
    </div>
  );
}
