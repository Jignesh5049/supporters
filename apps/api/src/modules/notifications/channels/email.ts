import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

export interface Email {
  to: string;
  subject: string;
  text: string;
}

/** Sends one email. Amazon SES on staging and production; tests use a fake. */
export interface EmailSender {
  send(email: Email): Promise<void>;
}

const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
};

/**
 * Development only (env validation refuses it on staging and production).
 * Writes to stdout, never to the structured log, and masks the address.
 */
export class ConsoleEmailSender implements EmailSender {
  async send(email: Email) {
    process.stdout.write(
      `[dev email] to ${maskEmail(email.to)}: ${email.subject}\n${email.text}\n`,
    );
  }
}

/** SES v2 through the instance role. */
export class SesEmailSender implements EmailSender {
  private readonly client: SESv2Client;

  constructor(
    region: string,
    private readonly from: string,
  ) {
    this.client = new SESv2Client({ region });
  }

  async send(email: Email) {
    await this.client.send(
      new SendEmailCommand({
        FromEmailAddress: this.from,
        Destination: { ToAddresses: [email.to] },
        Content: {
          Simple: {
            Subject: { Data: email.subject, Charset: 'UTF-8' },
            Body: { Text: { Data: email.text, Charset: 'UTF-8' } },
          },
        },
      }),
    );
  }
}
