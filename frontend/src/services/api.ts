import type {
  InventorySummary,
  NewVehicleInput,
  Paginated,
  Purchase,
  User,
  Vehicle,
  VehicleDetailsInput,
  VehicleFilters,
} from '../types/models';
import { apiRequest, buildQuery } from './api-client';

interface Envelope<T> {
  data: T;
}

const unwrap = <T>(promise: Promise<Envelope<T>>) => promise.then((envelope) => envelope.data);

export interface AuthSession {
  user: User;
  expiresAt: string;
}

export const authApi = {
  me: () => unwrap(apiRequest<Envelope<User>>('/auth/me')),
  login: (credentials: { email: string; password: string }) =>
    unwrap(apiRequest<Envelope<AuthSession>>('/auth/login', { method: 'POST', body: credentials })),
  register: (details: { name: string; email: string; password: string }) =>
    unwrap(apiRequest<Envelope<AuthSession>>('/auth/register', { method: 'POST', body: details })),
  logout: () => apiRequest<void>('/auth/logout', { method: 'POST' }),
};

/** Filters beyond paging/sorting need the search endpoint; plain browsing uses the list. */
function hasSearchFilters({
  q,
  make,
  model,
  category,
  minPrice,
  maxPrice,
  inStock,
}: VehicleFilters) {
  return [q, make, model, category, minPrice, maxPrice, inStock].some(
    (value) => value !== undefined && value !== '',
  );
}

export const vehiclesApi = {
  list: (filters: VehicleFilters = {}, signal?: AbortSignal) => {
    const path = hasSearchFilters(filters) ? '/vehicles/search' : '/vehicles';
    return apiRequest<Paginated<Vehicle>>(`${path}${buildQuery({ ...filters })}`, { signal });
  },
  get: (id: string) => unwrap(apiRequest<Envelope<Vehicle>>(`/vehicles/${id}`)),
  create: (input: NewVehicleInput) =>
    unwrap(apiRequest<Envelope<Vehicle>>('/vehicles', { method: 'POST', body: input })),
  update: (id: string, input: VehicleDetailsInput) =>
    unwrap(apiRequest<Envelope<Vehicle>>(`/vehicles/${id}`, { method: 'PUT', body: input })),
  remove: (id: string) => apiRequest<void>(`/vehicles/${id}`, { method: 'DELETE' }),
  purchase: (id: string, quantity: number, idempotencyKey: string) =>
    unwrap(
      apiRequest<Envelope<{ purchase: Purchase; vehicle: Vehicle }>>(`/vehicles/${id}/purchase`, {
        method: 'POST',
        body: { quantity },
        headers: { 'Idempotency-Key': idempotencyKey },
      }),
    ),
  restock: (id: string, quantity: number) =>
    unwrap(
      apiRequest<Envelope<Vehicle>>(`/vehicles/${id}/restock`, {
        method: 'POST',
        body: { quantity },
      }),
    ),
};

export const inventoryApi = {
  summary: () => unwrap(apiRequest<Envelope<InventorySummary>>('/inventory/summary')),
};
