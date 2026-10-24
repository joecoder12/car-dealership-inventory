import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { vehiclesApi } from '../services/api';
import type { VehicleFilters } from '../types/models';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  list: (filters: VehicleFilters) => ['vehicles', 'list', filters] as const,
  detail: (id: string) => ['vehicles', 'detail', id] as const,
};

/** A page of vehicles; the previous page stays visible while the next one loads. */
export function useVehicleList(filters: VehicleFilters) {
  return useQuery({
    queryKey: vehicleKeys.list(filters),
    queryFn: ({ signal }) => vehiclesApi.list(filters, signal),
    placeholderData: keepPreviousData,
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: vehicleKeys.detail(id),
    queryFn: () => vehiclesApi.get(id),
  });
}
