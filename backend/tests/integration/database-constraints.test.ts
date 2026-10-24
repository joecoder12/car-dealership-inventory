import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';

/**
 * Inventory invariants are enforced by PostgreSQL itself, so they hold even if
 * a future code path forgets to validate. These tests talk to the database
 * directly, bypassing the API.
 */
describe('database constraints', () => {
  const db = createTestDatabase();
  const validVehicle = {
    make: 'Toyota',
    model: 'Corolla',
    category: 'SEDAN' as const,
    price: '21999.00',
    quantity: 3,
  };

  beforeEach(() => resetDatabase(db));
  afterAll(() => db.$disconnect());

  it('stores a valid vehicle', async () => {
    const vehicle = await db.vehicle.create({ data: validVehicle });
    expect(vehicle.quantity).toBe(3);
    expect(vehicle.price.toFixed(2)).toBe('21999.00');
  });

  it('rejects a negative stock quantity', async () => {
    await expect(db.vehicle.create({ data: { ...validVehicle, quantity: -1 } })).rejects.toThrow(
      /vehicles_quantity_non_negative/,
    );
  });

  it('rejects a decrement that would take stock below zero', async () => {
    const vehicle = await db.vehicle.create({ data: { ...validVehicle, quantity: 1 } });

    await expect(
      db.vehicle.update({ where: { id: vehicle.id }, data: { quantity: { decrement: 2 } } }),
    ).rejects.toThrow(/vehicles_quantity_non_negative/);

    const unchanged = await db.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } });
    expect(unchanged.quantity).toBe(1);
  });

  it.each(['0', '-500.00'])('rejects a non-positive price (%s)', async (price) => {
    await expect(db.vehicle.create({ data: { ...validVehicle, price } })).rejects.toThrow(
      /vehicles_price_positive/,
    );
  });

  it('rejects an implausible model year', async () => {
    await expect(db.vehicle.create({ data: { ...validVehicle, year: 1700 } })).rejects.toThrow(
      /vehicles_year_range/,
    );
  });

  it('rejects e-mail addresses that are not stored lower-cased', async () => {
    await expect(
      db.user.create({ data: { name: 'Ada', email: 'Ada@Example.com', passwordHash: 'x' } }),
    ).rejects.toThrow(/users_email_lowercase/);
  });

  it('rejects a purchase record with a non-positive quantity', async () => {
    const user = await db.user.create({
      data: { name: 'Ada', email: 'ada@example.com', passwordHash: 'x' },
    });
    const vehicle = await db.vehicle.create({ data: validVehicle });

    await expect(
      db.purchase.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          vehicleMake: vehicle.make,
          vehicleModel: vehicle.model,
          quantity: 0,
          unitPrice: vehicle.price,
          totalPrice: vehicle.price,
        },
      }),
    ).rejects.toThrow(/purchases_quantity_positive/);
  });
});
