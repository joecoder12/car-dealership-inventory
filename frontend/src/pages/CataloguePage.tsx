import type { ReactNode } from 'react';
import { CatalogueFilters, SearchBox } from '../components/catalogue/CatalogueFilters';
import { Pagination } from '../components/catalogue/Pagination';
import { PurchaseButton } from '../components/purchase/PurchaseButton';
import { Button } from '../components/ui/Button';
import { VehicleCard, VehicleCardSkeleton } from '../components/vehicles/VehicleCard';
import { useVehicleFilters } from '../hooks/useVehicleFilters';
import { useVehicleList } from '../hooks/useVehicles';

function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-ink-200 bg-white/60 px-6 py-16 text-center">
      <svg viewBox="0 0 64 32" className="h-10 text-ink-300" aria-hidden="true">
        <path
          d="M6 24h52M14 24l6-10h22l8 10M20 14l3-6h16l4 6"
          stroke="currentColor"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="25" r="4" fill="currentColor" />
        <circle cx="44" cy="25" r="4" fill="currentColor" />
      </svg>
      <h2 className="mt-5 text-xl font-semibold text-ink-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-ink-500">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function CataloguePage() {
  const { filters, update, clear, hasActiveFilters } = useVehicleFilters();
  const { data, isPending, isError, error, refetch, isFetching, isPlaceholderData } =
    useVehicleList(filters);

  const changePage = (page: number) => {
    update({ page: page > 1 ? page : undefined });
    document.getElementById('results')?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  };

  let results: ReactNode;
  if (isPending) {
    results = (
      <div aria-busy="true">
        <p className="sr-only">Loading vehicles…</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => (
            <VehicleCardSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  } else if (isError) {
    results = (
      <EmptyState
        title="We couldn’t load the showroom"
        body={error.message}
        action={
          <Button variant="dark" onClick={() => void refetch()}>
            Try again
          </Button>
        }
      />
    );
  } else if (data.data.length === 0) {
    results = hasActiveFilters ? (
      <EmptyState
        title="No vehicles match your search"
        body="Try a different make or model, widen the price range, or include sold-out vehicles."
        action={
          <Button variant="secondary" onClick={clear}>
            Clear all filters
          </Button>
        }
      />
    ) : (
      <EmptyState
        title="The showroom is empty"
        body="No vehicles have been listed yet. Please check back soon."
      />
    );
  } else {
    results = (
      <>
        <ul
          className={`grid gap-6 transition-opacity sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${
            isPlaceholderData ? 'opacity-60' : ''
          }`}
          aria-busy={isFetching || undefined}
        >
          {data.data.map((vehicle) => (
            <li key={vehicle.id} className="flex">
              <div className="flex w-full flex-col [&>article]:flex-1">
                <VehicleCard vehicle={vehicle} action={<PurchaseButton vehicle={vehicle} />} />
              </div>
            </li>
          ))}
        </ul>
        <Pagination meta={data.meta} onPageChange={changePage} />
      </>
    );
  }

  const total = data?.meta.total;

  return (
    <>
      <section className="relative overflow-hidden bg-ink-950 text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(60rem_30rem_at_85%_-10%,rgb(238_97_24/0.28),transparent_60%),radial-gradient(40rem_24rem_at_0%_120%,rgb(91_102_121/0.35),transparent_60%)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-20 lg:px-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-ember-300 uppercase">
            The Northlane showroom
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl leading-[1.08] font-semibold sm:text-5xl">
            Find the one that moves you.
          </h1>
          <p className="mt-4 max-w-xl text-base text-ink-300">
            Browse our live inventory, compare prices and drive home with confidence. Stock levels
            update the moment a vehicle is sold.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBox filters={filters} onChange={update} />
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CatalogueFilters filters={filters} onChange={update} />

        <div id="results" className="mt-10 mb-5 flex scroll-mt-24 items-baseline justify-between">
          <h2 className="text-xl font-semibold text-ink-950">Available vehicles</h2>
          {total !== undefined && !isError && (
            <p className="text-sm text-ink-500" aria-live="polite">
              {total} {total === 1 ? 'vehicle' : 'vehicles'}
            </p>
          )}
        </div>
        {results}
      </div>
    </>
  );
}
