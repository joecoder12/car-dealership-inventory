import { useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import { DeleteVehicleDialog } from '../../components/admin/DeleteVehicleDialog';
import { RestockDialog } from '../../components/admin/RestockDialog';
import { SearchBox } from '../../components/catalogue/CatalogueFilters';
import { Pagination } from '../../components/catalogue/Pagination';
import { Button } from '../../components/ui/Button';
import { buttonClasses } from '../../components/ui/styles';
import { StockBadge } from '../../components/vehicles/StockBadge';
import { VehicleArt } from '../../components/vehicles/VehicleArt';
import { useInventorySummary } from '../../hooks/useInventoryMutations';
import { useVehicleFilters } from '../../hooks/useVehicleFilters';
import { useVehicleList } from '../../hooks/useVehicles';
import { categoryLabel, formatPrice, vehicleName } from '../../lib/format';
import type { Vehicle } from '../../types/models';

const ADMIN_PAGE_SIZE = 20;

function Stat({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  tone?: 'neutral' | 'warn' | 'bad';
}) {
  const accent = { neutral: 'bg-ink-300', warn: 'bg-amber-400', bad: 'bg-rose-500' }[tone];
  return (
    <li className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-card ring-1 ring-ink-900/5">
      <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <p className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink-950">{value}</p>
    </li>
  );
}

function SummaryCards() {
  const { data, isPending, isError } = useInventorySummary();
  const show = (value: (summary: NonNullable<typeof data>) => ReactNode) =>
    isPending ? '…' : isError ? '—' : value(data);

  return (
    <ul aria-label="Inventory summary" className="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <Stat label="Vehicles" value={show((s) => s.vehicleCount)} />
      <Stat label="Units in stock" value={show((s) => s.totalUnits)} />
      <Stat label="Low stock" value={show((s) => s.lowStockCount)} tone="warn" />
      <Stat label="Sold out" value={show((s) => s.outOfStockCount)} tone="bad" />
      <li className="col-span-2 rounded-2xl bg-ink-950 p-5 text-white shadow-card lg:col-span-1">
        <p className="text-xs font-medium tracking-wide text-ink-300 uppercase">Inventory value</p>
        <p className="mt-2 font-display text-2xl font-semibold">
          {show((s) => formatPrice(s.inventoryValue))}
        </p>
      </li>
    </ul>
  );
}

type PendingAction = { kind: 'restock' | 'delete'; vehicle: Vehicle } | null;

export function AdminInventoryPage() {
  const { filters, update } = useVehicleFilters();
  const query = useVehicleList({ ...filters, pageSize: ADMIN_PAGE_SIZE });
  const [action, setAction] = useState<PendingAction>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-ember-700 uppercase">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-ink-950">Inventory</h1>
          <p className="mt-1 text-sm text-ink-500">
            Add, edit, restock and remove vehicles. Changes are live in the showroom immediately.
          </p>
        </div>
        <Link to="/admin/vehicles/new" className={buttonClasses('primary')}>
          <span aria-hidden="true">＋</span> Add vehicle
        </Link>
      </div>

      <div className="mt-8">
        <SummaryCards />
      </div>

      <section aria-labelledby="vehicles-heading" className="mt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="vehicles-heading" className="text-lg font-semibold text-ink-950">
            All vehicles
          </h2>
          <div className="sm:w-96 [&_input]:h-11 [&_input]:rounded-xl [&_input]:text-sm [&_input]:shadow-card">
            <SearchBox filters={filters} onChange={update} />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl bg-white shadow-card ring-1 ring-ink-900/5">
          {query.isPending ? (
            <p className="p-8 text-center text-sm text-ink-500" aria-busy="true">
              Loading vehicles…
            </p>
          ) : query.isError ? (
            <div className="p-8 text-center">
              <p className="text-sm text-rose-700">{query.error.message}</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => void query.refetch()}
              >
                Try again
              </Button>
            </div>
          ) : query.data.data.length === 0 ? (
            <p className="p-8 text-center text-sm text-ink-500">No vehicles found.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-ink-100 text-xs tracking-wide text-ink-500 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Vehicle
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Category
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-5 py-3 font-medium">
                    Stock
                  </th>
                  <th scope="col" className="px-5 py-3 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {query.data.data.map((vehicle) => {
                  const name = vehicleName(vehicle);
                  return (
                    <tr key={vehicle.id} className="transition-colors hover:bg-ink-50/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <VehicleArt vehicle={vehicle} className="h-10 w-16 shrink-0" />
                          <div>
                            <Link
                              to={`/vehicles/${vehicle.id}`}
                              className="font-semibold text-ink-950 hover:text-ember-700"
                            >
                              {name}
                            </Link>
                            <p className="text-xs text-ink-500">{vehicle.year ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-ink-700">{categoryLabel(vehicle.category)}</td>
                      <td className="px-5 py-3 font-medium text-ink-900">
                        {formatPrice(vehicle.price)}
                      </td>
                      <td className="px-5 py-3">
                        <StockBadge quantity={vehicle.quantity} />
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setAction({ kind: 'restock', vehicle })}
                          >
                            Restock <span className="sr-only">{name}</span>
                          </Button>
                          <Link
                            to={`/admin/vehicles/${vehicle.id}/edit`}
                            className={buttonClasses('ghost', 'sm')}
                          >
                            Edit <span className="sr-only">{name}</span>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-rose-700 hover:bg-rose-50"
                            onClick={() => setAction({ kind: 'delete', vehicle })}
                          >
                            Delete <span className="sr-only">{name}</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {query.data && (
          <Pagination
            meta={query.data.meta}
            onPageChange={(page) => update({ page: page > 1 ? page : undefined })}
          />
        )}
      </section>

      {action?.kind === 'restock' && (
        <RestockDialog vehicle={action.vehicle} onClose={() => setAction(null)} />
      )}
      {action?.kind === 'delete' && (
        <DeleteVehicleDialog vehicle={action.vehicle} onClose={() => setAction(null)} />
      )}
    </div>
  );
}
