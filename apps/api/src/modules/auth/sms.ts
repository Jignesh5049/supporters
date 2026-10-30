/** Sends OTP texts. MSG91 (DLT-approved template) implements this next; tests use a fake. */
export interface SmsSender {
  sendOtp(phone: string, code: string): Promise<void>;
}

const maskPhone = (phone: string) => `${phone.slice(0, 3)}******${phone.slice(-4)}`;

/**
 * Development only (env validation refuses it on staging and production).
 * Writes to stdout, never to the structured log, so codes stay out of log shipping.
 */
export class ConsoleSmsSender implements SmsSender {
  async sendOtp(phone: string, code: string) {
    process.stdout.write(`[dev sms] OTP for ${maskPhone(phone)}: ${code}\n`);
  }
}
