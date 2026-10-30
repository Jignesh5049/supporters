import { execFileSync } from 'node:child_process';
import { CreateBucketCommand, S3Client } from '@aws-sdk/client-s3';
import { createRequire } from 'node:module';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer, Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';
import { seedReferenceData } from '../../prisma/reference-data';
import { createPrisma } from '../plugins/data';
import { MINIO_CREDENTIALS, MINIO_IMAGE, TEST_BUCKET } from './minio';

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
    valkeyUrl: string;
    s3Endpoint: string;
  }
}

let postgres: StartedPostgreSqlContainer | undefined;
let valkey: StartedTestContainer | undefined;
let minio: StartedTestContainer | undefined;

export async function setup(project: TestProject) {
  [postgres, valkey, minio] = await Promise.all([
    new PostgreSqlContainer('postgres:18.1-alpine').start(),
    new GenericContainer('valkey/valkey:9.0-alpine')
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start(),
    // Runs as root: the image can't initialise its drive as its non-root user (see compose).
    new GenericContainer(MINIO_IMAGE)
      .withUser('0')
      .withCommand(['server', '/data'])
      .withEnvironment({
        MINIO_ROOT_USER: MINIO_CREDENTIALS.accessKeyId,
        MINIO_ROOT_PASSWORD: MINIO_CREDENTIALS.secretAccessKey,
      })
      .withExposedPorts(9000)
      .withWaitStrategy(Wait.forHttp('/minio/health/live', 9000))
      .start(),
  ]);

  const s3Endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`;
  const s3 = new S3Client({
    region: 'ap-south-1',
    endpoint: s3Endpoint,
    forcePathStyle: true,
    credentials: MINIO_CREDENTIALS,
  });
  await s3.send(new CreateBucketCommand({ Bucket: TEST_BUCKET }));
  s3.destroy();
  project.provide('s3Endpoint', s3Endpoint);

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
  await Promise.all([postgres?.stop(), valkey?.stop(), minio?.stop()]);
}
