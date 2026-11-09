import { sendEmail as send } from '@/components/transactional_email/email';

/**
 * The email seam, now implemented.
 *
 * This replaced the stub that threw "this needs the Emailing your users
 * component". Callers of `sendEmail()` written before the install keep working
 * unchanged (ARCHITECTURE.md, ARC-03).
 *
 * This file declares no stub marker, and that absence is load-bearing.
 *
 * The seam returns an outcome rather than throwing, and that is not laziness.
 * Most mail is sent alongside something that already succeeded — the account
 * exists, the invoice is paid — and throwing here would roll back or 500 a
 * request whose real work was done. The caller decides whether an unsent
 * message matters enough to fail on, and for a password reset the answer is
 * usually yes.
 *
 * Nothing leaves the machine until `EMAIL_API_KEY` is set, and outside
 * production nothing leaves it except to addresses on `EMAIL_ALLOWLIST`. Both
 * refusals come back as `sent: false` with a reason, not as silence.
 */

export interface SeamEmail {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /**
   * Files to send with it, such as a PDF invoice: a name and the bytes (1.4.0).
   * Optional, so every caller written before it keeps working.
   */
  attachments?: { filename: string; content: Uint8Array; contentType?: string }[];
}

export interface SeamEmailResult {
  sent: boolean;
  error?: string;
}

export async function sendEmail(message: SeamEmail): Promise<SeamEmailResult> {
  const outcome = await send({
    to: message.to,
    subject: message.subject,
    html: message.html,
    ...(message.text === undefined ? {} : { text: message.text }),
    ...(message.replyTo === undefined ? {} : { replyTo: message.replyTo }),
    ...(message.attachments === undefined ? {} : { attachments: message.attachments }),
  });

  // Narrowed to the two fields the seam promises, so a caller written against
  // the seam cannot come to depend on something only this provider returns and
  // then break when the provider changes.
  return outcome.error === undefined
    ? { sent: outcome.sent }
    : { sent: outcome.sent, error: outcome.error };
}
