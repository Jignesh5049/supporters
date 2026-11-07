import { passwordSchema, personNameSchema, phoneSchema } from '@supporters/shared';
import type { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { sealSecret } from '../../lib/secret-box';
import { generateTotpSecret, totpUri } from '../../lib/totp';
import { hashPassword } from '../auth/passwords';

export interface AdminEnrolment {
  userId: string;
  /** Shown once to the person enrolling; it is stored only encrypted. */
  otpauthUri: string;
}

/** The parsed value, or an error naming the field (never echoing the value). */
function parse<T extends z.ZodType>(schema: T, value: unknown, field: string): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid ${field}: ${result.error.issues[0]?.message ?? 'check the value'}`);
  }
  return result.data;
}

/**
 * Creates an admin account with a fresh TOTP secret (backend spec, Security:
 * Admin: created only by scripts/create-admin.ts, never by sign-up). The phone
 * must not belong to any account: admins use separate, work-only accounts.
 */
export async function createAdmin(
  prisma: PrismaClient,
  encryptionKey: Buffer,
  input: { phone: string; name: string; password: string },
): Promise<AdminEnrolment> {
  const phone = parse(phoneSchema, input.phone, 'phone');
  const name = parse(personNameSchema, input.name, 'name');
  const password = parse(passwordSchema, input.password, 'password');
  if (await prisma.user.findUnique({ where: { phone }, select: { id: true } })) {
    throw new Error('An account with this phone already exists');
  }
  const secret = generateTotpSecret();
  const user = await prisma.user.create({
    data: { phone, name, passwordHash: await hashPassword(password), role: 'admin' },
    select: { id: true },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: sealSecret(encryptionKey, secret, user.id) },
  });
  return { userId: user.id, otpauthUri: totpUri(secret, phone) };
}

/**
 * Replaces an admin's TOTP secret (a lost phone). The caller then signs the
 * admin out everywhere, so the old authenticator keeps no one signed in.
 */
export async function resetAdminTotp(
  prisma: PrismaClient,
  encryptionKey: Buffer,
  phoneInput: string,
): Promise<AdminEnrolment> {
  const phone = parse(phoneSchema, phoneInput, 'phone');
  const user = await prisma.user.findUnique({ where: { phone }, select: { id: true, role: true } });
  if (user?.role !== 'admin') throw new Error('No admin account with this phone');
  const secret = generateTotpSecret();
  await prisma.user.update({
    where: { id: user.id },
    data: { totpSecret: sealSecret(encryptionKey, secret, user.id) },
  });
  return { userId: user.id, otpauthUri: totpUri(secret, phone) };
}
