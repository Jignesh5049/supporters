import { authenticateBiometric } from '../../lib/auth/biometrics';

/**
 * Raised when the user dismisses or fails the biometric prompt: the money action was NOT sent.
 * Screens treat it as "the user changed their mind", not as an error to report.
 */
export class ConfirmationCancelledError extends Error {
  constructor() {
    super('Confirmation was cancelled');
    this.name = 'ConfirmationCancelledError';
  }
}

export type Confirm = (promptMessage: string) => Promise<boolean>;

/** Face ID, fingerprint or the device passcode (MASVS-AUTH: confirm before a money action). */
export const confirmIdentity: Confirm = async (promptMessage) =>
  (await authenticateBiometric(promptMessage)).success;

/**
 * Runs `action` only after the user confirms their identity. When the prompt is dismissed or
 * fails, nothing is sent: `action` is never called.
 */
export async function afterConfirmation<T>(
  confirm: Confirm,
  promptMessage: string,
  action: () => Promise<T>,
): Promise<T> {
  if (!(await confirm(promptMessage))) throw new ConfirmationCancelledError();
  return action();
}
