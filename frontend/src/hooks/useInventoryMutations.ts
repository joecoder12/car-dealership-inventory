import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { vehiclesApi } from '../services/api';
import type { Paginated, Vehicle } from '../types/models';
import { vehicleKeys } from './useVehicles';

export const inventoryKeys = { summary: ['inventory', 'summary'] as const };

/** Shows the server's latest version of a vehicle everywhere it is cached. */
export function replaceCachedVehicle(queryClient: QueryClient, vehicle: Vehicle) {
  queryClient.setQueryData(vehicleKeys.detail(vehicle.id), vehicle);
  queryClient.setQueriesData<Paginated<Vehicle>>({ queryKey: ['vehicles', 'list'] }, (page) =>
    page
      ? { ...page, data: page.data.map((item) => (item.id === vehicle.id ? vehicle : item)) }
      : page,
  );
}

/**
 * After any stock-changing request, success or failure, refetch vehicle lists
 * and stats: filters such as "in stock only" may now match different vehicles,
 * and a failed purchase usually means our copy of the stock level was stale.
 */
function refreshInventory(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: vehicleKeys.all });
  void queryClient.invalidateQueries({ queryKey: ['inventory'] });
}

export function usePurchaseVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; quantity: number; idempotencyKey: string }) =>
      vehiclesApi.purchase(input.id, input.quantity, input.idempotencyKey),
    onSuccess: ({ vehicle }) => {
      if (vehicle) replaceCachedVehicle(queryClient, vehicle);
    },
    onSettled: () => refreshInventory(queryClient),
  });
}
