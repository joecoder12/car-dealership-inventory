import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';

export type Database = PrismaClient;

/** Creates a Prisma client that talks to PostgreSQL through the `pg` driver adapter. */
export function createDatabaseClient(databaseUrl: string): Database {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
}
