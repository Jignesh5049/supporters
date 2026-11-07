import { Writable } from 'node:stream';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import pino from 'pino';
import { loadEnv } from '../src/config/env';
import { createAdmin, resetAdminTotp } from '../src/modules/admin/admin-accounts';
import { SessionService } from '../src/modules/auth/session.service';
import { createPrisma, createValkey } from '../src/plugins/data';

/**
 * The only way to create an admin (backend spec, Security: Admin).
 *
 *   pnpm admin:create --phone +919800000000 --name "Asha (Ops)"
 *   pnpm admin:create --reset-totp --phone +919800000000
 *
 * The password is typed at a hidden prompt, never passed as an argument (it
 * would land in shell history). The TOTP enrolment link is printed once, for
 * the admin to add to their authenticator app; it is stored only encrypted.
 */

const USAGE = 'Usage: admin:create --phone <+91...> --name <name> | --reset-totp --phone <+91...>';

/** Reads a line without echoing it. */
async function promptHidden(question: string): Promise<string> {
  let muted = false;
  const output = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (!muted) process.stdout.write(chunk);
      callback();
    },
  });
  const rl = createInterface({ input: process.stdin, output, terminal: process.stdin.isTTY });
  const answer = rl.question(question);
  muted = true;
  const value = await answer;
  rl.close();
  process.stdout.write('\n');
  return value;
}

async function main() {
  const { values } = parseArgs({
    options: {
      phone: { type: 'string' },
      name: { type: 'string' },
      'reset-totp': { type: 'boolean', default: false },
    },
  });
  if (!values.phone || (!values['reset-totp'] && !values.name)) throw new Error(USAGE);

  const env = loadEnv();
  if (!env.TOTP_ENCRYPTION_KEY) throw new Error('Set TOTP_ENCRYPTION_KEY first');
  const prisma = createPrisma(env.DATABASE_URL);
  const valkey = createValkey(env.VALKEY_URL);
  try {
    let enrolment;
    if (values['reset-totp']) {
      enrolment = await resetAdminTotp(prisma, env.TOTP_ENCRYPTION_KEY, values.phone);
      const sessions = new SessionService(prisma, valkey, pino({ level: 'warn' }));
      const revoked = await sessions.revokeAllForUser(enrolment.userId);
      process.stdout.write(`New TOTP secret set; ${revoked.length} session(s) signed out.\n`);
    } else {
      const password = await promptHidden('Password (min 10 characters): ');
      if ((await promptHidden('Repeat password: ')) !== password) {
        throw new Error('The passwords do not match');
      }
      enrolment = await createAdmin(prisma, env.TOTP_ENCRYPTION_KEY, {
        phone: values.phone,
        name: values.name ?? '',
        password,
      });
      process.stdout.write(`Admin ${enrolment.userId} created.\n`);
    }
    process.stdout.write(
      [
        '',
        'Add this to the admin’s authenticator app (scan it as a QR code or paste it), then',
        'close this terminal. It is not shown again.',
        '',
        enrolment.otpauthUri,
        '',
      ].join('\n'),
    );
  } finally {
    await prisma.$disconnect();
    await valkey.quit();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
