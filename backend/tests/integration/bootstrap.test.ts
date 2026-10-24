import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { ensureAdmin } from '../../src/bootstrap/admin.js';
import { DEMO_VEHICLES, seedCatalogue } from '../../src/bootstrap/seed-catalogue.js';
import { verifyPassword } from '../../src/modules/auth/password.js';
import { createTestDatabase, resetDatabase } from '../helpers/database.js';
import { createUser } from '../helpers/factories.js';

const db = createTestDatabase();

beforeEach(() => resetDatabase(db));
afterAll(() => db.$disconnect());

describe('seedCatalogue', () => {
  it('loads a varied demo catalogue, including sold-out vehicles', async () => {
    const result = await seedCatalogue(db);

    expect(result).toEqual({ created: DEMO_VEHICLES.length, skipped: 0 });
    expect(DEMO_VEHICLES.length).toBeGreaterThanOrEqual(12);
    const categories = await db.vehicle.groupBy({ by: ['category'] });
    expect(categories.length).toBeGreaterThanOrEqual(6);
    expect(await db.vehicle.count({ where: { quantity: 0 } })).toBeGreaterThanOrEqual(1);
  });

  it('is repeatable: running it again adds nothing and keeps edits', async () => {
    await seedCatalogue(db);
    const first = await db.vehicle.findFirstOrThrow();
    await db.vehicle.update({ where: { id: first.id }, data: { quantity: 42 } });

    const second = await seedCatalogue(db);

    expect(second).toEqual({ created: 0, skipped: DEMO_VEHICLES.length });
    expect(await db.vehicle.count()).toBe(DEMO_VEHICLES.length);
    expect((await db.vehicle.findUniqueOrThrow({ where: { id: first.id } })).quantity).toBe(42);
  });

  it('never creates user accounts', async () => {
    await seedCatalogue(db);

    expect(await db.user.count()).toBe(0);
  });
});

describe('ensureAdmin', () => {
  const input = { name: 'Dealer Admin', email: 'Admin@Example.com', password: 'Str0ng-admin-pass' };

  it('creates an ADMIN with a hashed password and normalised email', async () => {
    const result = await ensureAdmin(db, input);

    expect(result).toEqual({ status: 'created', email: 'admin@example.com' });
    const admin = await db.user.findUniqueOrThrow({ where: { email: 'admin@example.com' } });
    expect(admin.role).toBe('ADMIN');
    expect(await verifyPassword(admin.passwordHash, input.password)).toBe(true);
  });

  it('promotes an existing user without touching their password', async () => {
    const existing = await createUser(db, { email: 'admin@example.com', password: 'Original1' });

    const result = await ensureAdmin(db, input);

    expect(result).toEqual({ status: 'promoted', email: 'admin@example.com' });
    const promoted = await db.user.findUniqueOrThrow({ where: { id: existing.id } });
    expect(promoted.role).toBe('ADMIN');
    expect(await verifyPassword(promoted.passwordHash, 'Original1')).toBe(true);
  });

  it('applies the same validation rules as registration', async () => {
    await expect(ensureAdmin(db, { ...input, password: 'weak' })).rejects.toThrow(/password/i);
    await expect(ensureAdmin(db, { ...input, email: 'nope' })).rejects.toThrow(/email/i);
    expect(await db.user.count()).toBe(0);
  });
});
