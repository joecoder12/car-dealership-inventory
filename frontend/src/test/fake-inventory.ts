import { http, HttpResponse } from 'msw';
import type { InventorySummary, Vehicle } from '../types/models';
import { errorBody, pageOf } from './fixtures';
import { server } from './server';

interface RecordedRequest {
  method: string;
  path: string;
  body: unknown;
  headers: Headers;
}

/**
 * A small stateful stand-in for the vehicle endpoints, so component tests can
 * check that the UI shows what the server returns after a mutation (not just
 * that a request was fired). Mirrors the real API's status codes and shapes.
 */
export function useFakeInventory(initial: Vehicle[]) {
  const state = {
    vehicles: initial.map((vehicle) => ({ ...vehicle })),
    requests: [] as RecordedRequest[],
    purchasesByKey: new Map<string, unknown>(),
  };

  const record = async (request: Request) => {
    const body = await request
      .clone()
      .json()
      .catch(() => undefined);
    state.requests.push({
      method: request.method,
      path: new URL(request.url).pathname,
      body,
      headers: request.headers,
    });
  };

  const find = (id: unknown) => state.vehicles.find((vehicle) => vehicle.id === id);
  const notFound = () =>
    HttpResponse.json(errorBody('VEHICLE_NOT_FOUND', 'Vehicle not found'), { status: 404 });

  server.use(
    http.get('*/api/vehicles', () => HttpResponse.json(pageOf(state.vehicles))),
    http.get('*/api/vehicles/search', () => HttpResponse.json(pageOf(state.vehicles))),
    http.get('*/api/inventory/summary', () => {
      const summary: InventorySummary = {
        vehicleCount: state.vehicles.length,
        totalUnits: state.vehicles.reduce((sum, v) => sum + v.quantity, 0),
        outOfStockCount: state.vehicles.filter((v) => v.quantity === 0).length,
        lowStockCount: state.vehicles.filter((v) => v.quantity > 0 && v.quantity <= 3).length,
        lowStockThreshold: 3,
        inventoryValue: state.vehicles.reduce((sum, v) => sum + v.price * v.quantity, 0),
      };
      return HttpResponse.json({ data: summary });
    }),
    http.get('*/api/vehicles/:id', ({ params }) => {
      const vehicle = find(params.id);
      return vehicle ? HttpResponse.json({ data: vehicle }) : notFound();
    }),
    http.post('*/api/vehicles/:id/purchase', async ({ request, params }) => {
      await record(request);
      const key = request.headers.get('Idempotency-Key') ?? '';
      if (state.purchasesByKey.has(key)) {
        return HttpResponse.json({ data: state.purchasesByKey.get(key) }, { status: 200 });
      }
      const vehicle = find(params.id);
      if (!vehicle) return notFound();
      const { quantity = 1 } = ((await request.json()) ?? {}) as { quantity?: number };
      if (vehicle.quantity < quantity) {
        return HttpResponse.json(
          errorBody(
            'INSUFFICIENT_STOCK',
            `Only ${vehicle.quantity} unit(s) in stock; cannot purchase ${quantity}`,
          ),
          { status: 409 },
        );
      }
      vehicle.quantity -= quantity;
      const result = {
        purchase: {
          id: `purchase-${state.requests.length}`,
          vehicleId: vehicle.id,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          quantity,
          unitPrice: vehicle.price,
          totalPrice: vehicle.price * quantity,
          createdAt: new Date().toISOString(),
        },
        vehicle: { ...vehicle },
      };
      state.purchasesByKey.set(key, result);
      return HttpResponse.json({ data: result }, { status: 201 });
    }),
    http.post('*/api/vehicles/:id/restock', async ({ request, params }) => {
      await record(request);
      const vehicle = find(params.id);
      if (!vehicle) return notFound();
      const { quantity } = (await request.json()) as { quantity: number };
      vehicle.quantity += quantity;
      return HttpResponse.json({ data: { ...vehicle } });
    }),
    http.post('*/api/vehicles', async ({ request }) => {
      await record(request);
      const input = (await request.json()) as Omit<Vehicle, 'id' | 'createdAt' | 'updatedAt'>;
      const vehicle: Vehicle = {
        ...input,
        id: `00000000-0000-4000-8000-9${String(state.vehicles.length).padStart(11, '0')}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.vehicles.unshift(vehicle);
      return HttpResponse.json({ data: vehicle }, { status: 201 });
    }),
    http.put('*/api/vehicles/:id', async ({ request, params }) => {
      await record(request);
      const vehicle = find(params.id);
      if (!vehicle) return notFound();
      Object.assign(vehicle, await request.json(), { updatedAt: new Date().toISOString() });
      return HttpResponse.json({ data: { ...vehicle } });
    }),
    http.delete('*/api/vehicles/:id', async ({ request, params }) => {
      await record(request);
      const index = state.vehicles.findIndex((vehicle) => vehicle.id === params.id);
      if (index === -1) return notFound();
      state.vehicles.splice(index, 1);
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return state;
}
