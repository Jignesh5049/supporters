import argon2 from 'argon2';
import { CURRENT_POLICY_VERSION } from '@supporters/shared';
import { createPrisma } from '../src/plugins/data';
import { ARGON2_OPTIONS } from '../src/modules/auth/auth.constants';

/**
 * Local and staging seed. Categories, states and cities join when their tables
 * land. Refuses to run against production.
 */
if (process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to seed a production database');
}
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const prisma = createPrisma(databaseUrl);

// Fake staging users. The password is shared and local-only, and is printed so
// developers can sign in; it is not a secret.
const DEMO_PASSWORD = 'supporters-demo-password';
const demoUsers = [
  { name: 'Asha Traders (demo)', phone: '+919000000001' },
  { name: 'Ravi Buyer (demo)', phone: '+919000000002' },
];

const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id, ...ARGON2_OPTIONS });
for (const user of demoUsers) {
  await prisma.user.upsert({
    where: { phone: user.phone },
    update: {},
    create: {
      ...user,
      passwordHash,
      consents: { create: { policyVersion: CURRENT_POLICY_VERSION } },
    },
  });
}
await prisma.$disconnect();
process.stdout.write(`Seeded ${demoUsers.length} demo users (password: ${DEMO_PASSWORD}).\n`);
