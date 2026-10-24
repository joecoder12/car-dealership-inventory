import { http, HttpResponse } from 'msw';
import type { Paginated, User, Vehicle } from '../types/models';
import { server } from './server';

export function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    role: 'USER',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export const makeAdmin = (overrides: Partial<User> = {}) =>
  makeUser({
    id: 'admin-1',
    name: 'Grace Admin',
    email: 'grace@example.com',
    role: 'ADMIN',
    ...overrides,
  });

let vehicleCounter = 0;

export function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  vehicleCounter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(vehicleCounter).padStart(12, '0')}`,
    make: 'Toyota',
    model: 'Camry',
    category: 'SEDAN',
    price: 28999,
    quantity: 4,
    year: 2025,
    fuelType: 'HYBRID',
    description: 'Comfortable hybrid sedan.',
    imageUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function pageOf(vehicles: Vehicle[], meta: Partial<Paginated<Vehicle>['meta']> = {}) {
  return {
    data: vehicles,
    meta: { page: 1, pageSize: 12, total: vehicles.length, totalPages: 1, ...meta },
  } satisfies Paginated<Vehicle>;
}

/** Makes GET /api/auth/me report this user as signed in. */
export function signInAs(user: User) {
  server.use(http.get('*/api/auth/me', () => HttpResponse.json({ data: user })));
  return user;
}

export function errorBody(code: string, message: string, details?: unknown[]) {
  return { error: { code, message, ...(details ? { details } : {}) } };
}
