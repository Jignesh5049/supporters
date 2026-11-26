import type { FastifyRequest } from 'fastify';

/**
 * What the client can tell us about the device behind a signup (backend spec, Security: Device
 * attestation).
 *
 * HOOK, NOT IMPLEMENTED: the auth layer has no Play Integrity / App Attest verification yet, and
 * the `devices` table is never populated. Until it is, both signals are null ("not attested"),
 * and the device-reuse and attestation rules below never fire on real traffic (they are tested
 * with injected signals). When attestation lands, return its result here and nothing else changes:
 * `attestationPassed === false` makes the referral Ineligible, and an equal `deviceKey` on two
 * accounts is device reuse.
 */
export interface SignupSignals {
  /** A stable per-device identifier from attestation (hashed before it is stored). */
  deviceKey: string | null;
  /** The attestation verdict: true passed, false failed, null not attempted. */
  attestationPassed: boolean | null;
}

export const NO_SIGNALS: SignupSignals = { deviceKey: null, attestationPassed: null };

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the hook will read the request
export function signupSignals(request: FastifyRequest): SignupSignals {
  return NO_SIGNALS;
}
