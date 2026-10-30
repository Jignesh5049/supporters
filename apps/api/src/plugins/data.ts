import { PrismaPg } from '@prisma/adapter-pg';
import fp from 'fastify-plugin';
import { Redis } from 'ioredis';
import { PrismaClient } from '../generated/prisma/client';
import { SlidingWindowLimiter } from '../lib/sliding-window';

export const createPrisma = (databaseUrl: string) =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });

export const createValkey = (valkeyUrl: string) =>
  new Redis(valkeyUrl, { maxRetriesPerRequest: 2, enableAutoPipelining: true });

interface DataOptions {
  prisma?: PrismaClient;
  valkey?: Redis;
}

/** PostgreSQL (Prisma) and Valkey clients. Clients passed in (tests) are left open on close. */
export const prismaPlugin = fp<DataOptions>(
  async (app, options) => {
    const prisma = options.prisma ?? createPrisma(app.env.DATABASE_URL);
    app.decorate('prisma', prisma);
    if (!options.prisma) app.addHook('onClose', async () => prisma.$disconnect());
  },
  { name: 'prisma', dependencies: ['env'] },
);

export const valkeyPlugin = fp<DataOptions>(
  async (app, options) => {
    const valkey = options.valkey ?? createValkey(app.env.VALKEY_URL);
    app.decorate('valkey', valkey);
    app.decorate('limiter', new SlidingWindowLimiter(valkey));
    if (!options.valkey) {
      app.addHook('onClose', async () => {
        await valkey.quit();
      });
    }
  },
  { name: 'valkey', dependencies: ['env'] },
);
