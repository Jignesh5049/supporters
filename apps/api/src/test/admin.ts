import { createAdmin } from '../modules/admin/admin-accounts';
import { base32Decode, currentStep, totpAt } from '../lib/totp';
import { Browser, PASSWORD, TEST_TOTP_KEY, type TestContext, nextPhone, prisma } from './helpers';

export interface TestAdmin {
  userId: string;
  phone: string;
  secret: Buffer;
  /** Time-step offsets already used, so each sign-in sends a fresh code (no replay). */
  usedOffsets: number[];
}

/** Creates an admin the way scripts/create-admin.ts does, keeping the TOTP secret. */
export async function enrolAdmin(name = 'Ops Admin'): Promise<TestAdmin> {
  const phone = nextPhone();
  const { userId, otpauthUri } = await createAdmin(prisma, TEST_TOTP_KEY, {
    phone,
    name,
    password: PASSWORD,
  });
  const secret = base32Decode(new URL(otpauthUri).searchParams.get('secret') ?? '');
  return { userId, phone, secret, usedOffsets: [] };
}

/** A valid code `offset` steps from now (the server accepts -1, 0 and +1). */
export const codeAt = (admin: TestAdmin, offset = 0) =>
  totpAt(admin.secret, currentStep(Date.now()) + offset);

/** The next unused valid code (offsets 0 and +1 stay valid across a step boundary). */
export function freshCode(admin: TestAdmin): string {
  const offset = [0, 1].find((candidate) => !admin.usedOffsets.includes(candidate));
  if (offset === undefined) throw new Error('two sign-ins per admin per test at most');
  admin.usedOffsets.push(offset);
  return codeAt(admin, offset);
}

/** Signs the admin in through the real endpoint and returns the browser holding the cookie. */
export async function adminBrowser(ctx: TestContext, admin: TestAdmin): Promise<Browser> {
  const browser = new Browser(ctx.app);
  const response = await browser.request({
    method: 'POST',
    url: '/v1/admin/auth/login',
    body: { identifier: admin.phone, password: PASSWORD, code: freshCode(admin) },
  });
  if (response.statusCode !== 200) throw new Error(`admin login failed: ${response.body}`);
  return browser;
}
