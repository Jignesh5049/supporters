import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';
import { seedReferenceData } from '../../prisma/reference-data';
import { createPrisma } from '../plugins/data';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    valkeyUrl: string;
  }
}

let postgres: StartedPostgreSqlContainer | undefined;
let valkey: StartedTestContainer | undefined;

export async function setup(project: TestProject) {
  [postgres, valkey] = await Promise.all([
    new PostgreSqlContainer('postgres:18.1-alpine').start(),
    new GenericContainer('valkey/valkey:9.0-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start(),
  ]);

  const databaseUrl = postgres.getConnectionUri();
  const prismaCli = createRequire(import.meta.url).resolve('prisma/build/index.js');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'pipe',
  });
  const prisma = createPrisma(databaseUrl);
  await seedReferenceData(prisma);
  await prisma.$disconnect();

  project.provide('databaseUrl', databaseUrl);
  project.provide('valkeyUrl', `redis://${valkey.getHost()}:${valkey.getMappedPort(6379)}`);
}

export async function teardown() {
  await Promise.all([postgres?.stop(), valkey?.stop()]);
}
