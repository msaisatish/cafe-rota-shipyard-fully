import {
  providerFromEnv,
  readableSize,
  type EmailAttachment,
  type EmailMessage,
  type EmailProvider,
  type SendOutcome,
} from '@/components/transactional_email/providers';

export type { EmailAttachment };

/**
 * Sending an email, with the guard rails on.
 *
 * The guard rail that earns its place is the allowlist. Outside production,
 * this refuses to email anyone who is not explicitly listed — because the
 * accident it prevents is a seed script or a test run reaching a real customer,
 * and that accident is unrecoverable in a way that a bug in a template is not.
 */

/** A shape check, not a validity check — only sending proves an address works. */
const ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function looksLikeAnAddress(value: string): boolean {
  const trimmed = value.trim();
  // Header injection: a newline in an address field can add headers of its own.
  if (/[\r\n]/.test(trimmed)) return false;
  if (trimmed.length > 254) return false;
  return ADDRESS.test(trimmed);
}

/** Who we are allowed to email in this environment. */
export function mayEmail(address: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV === 'production') return true;
  const allowed = (env.EMAIL_ALLOWLIST ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length === 0) return false;
  const target = address.trim().toLowerCase();
  return allowed.some((entry) =>
    entry.startsWith('@') ? target.endsWith(entry) : entry === target,
  );
}

/** Strip tags to make the plain-text alternative every email should carry. */
/** The entities `escape()` puts in, taken back out. */
function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    // Last, so that `&amp;lt;` does not become `<`.
    .replace(/&amp;/g, '&');
}

/**
 * The plain-text alternative.
 *
 * **Links keep their address.** Stripping tags without pulling the `href` out
 * first throws every URL away and leaves the words that were linked, so the
 * text version of a password reset email read "Choose a new password" and
 * contained no link at all. Anyone whose mail client shows text/plain — and
 * anyone reading the console provider's output in development — could not
 * finish resetting their password.
 *
 * It was invisible because the HTML was fine, the email was sent, the tests
 * checked that the text had no tags in it, and nobody read the text.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<a\b[^>]*\bhref=(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _quote, href: string, label: string) => {
      const url = decodeEntities(href).trim();
      const text = decodeEntities(label.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      if (!url) return text;
      // No point printing the same string twice when the link text is the URL.
      if (!text || text === url) return url;
      // Parentheses, not angle brackets. `text <url>` is the usual convention
      // and it does not survive this function: the tag stripper further down
      // sees `<https://...>` as a tag and removes the address again, which is
      // the bug this whole branch exists to fix, reintroduced three lines later.
      return `${text} (${url})`;
    })
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface SendRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Files to send with it, such as a PDF invoice (1.4.0). */
  attachments?: EmailAttachment[];
}

/**
 * The most the files on one email may add up to: 10 MB.
 *
 * Sending turns each file into text a third larger again, and many mail
 * servers refuse a message over about 10 to 25 MB without saying so to the
 * sender. Past this, send a link to the file instead.
 */
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

/** Why these attachments cannot be sent, or null when they can. */
export function attachmentProblem(attachments: readonly EmailAttachment[] | undefined): string | null {
  if (!attachments?.length) return null;
  let total = 0;
  for (const file of attachments) {
    const name = typeof file.filename === 'string' ? file.filename.trim() : '';
    if (!name) return 'Every attachment needs a file name.';
    // A line break in a file name ends up in the message's headers, the same
    // injection a line break in the subject would be. A folder in it is a
    // mistake at best.
    if (/[\r\n\0]/.test(name) || /[\\/]/.test(name)) {
      return `The attachment name "${name.replace(/[\r\n\0]/g, ' ')}" cannot contain a line break or a folder.`;
    }
    if (name.length > 255) return 'An attachment name can be at most 255 characters.';
    if (!(file.content instanceof Uint8Array)) return `The attachment "${name}" has no file contents.`;
    // An empty file is nearly always a document that failed to generate.
    if (file.content.byteLength === 0) return `The attachment "${name}" is empty.`;
    if (file.contentType !== undefined && /[\r\n]/.test(file.contentType)) {
      return `The type given for "${name}" cannot contain a line break.`;
    }
    total += file.content.byteLength;
  }
  if (total > MAX_ATTACHMENT_BYTES) {
    return `The attachments add up to ${readableSize(total)}, more than the ${readableSize(MAX_ATTACHMENT_BYTES)} many mailboxes accept. Send a link to the file instead.`;
  }
  return null;
}

export async function sendEmail(
  request: SendRequest,
  options: { provider?: EmailProvider; env?: NodeJS.ProcessEnv } = {},
): Promise<SendOutcome> {
  const env = options.env ?? process.env;

  if (!looksLikeAnAddress(request.to)) {
    return { sent: false, error: 'That does not look like an email address.' };
  }
  if (/[\r\n]/.test(request.subject)) {
    return { sent: false, error: 'The subject line cannot contain a line break.' };
  }
  const attachmentRefusal = attachmentProblem(request.attachments);
  if (attachmentRefusal) return { sent: false, error: attachmentRefusal };
  if (!mayEmail(request.to, env)) {
    console.info(`[email] not sending to ${request.to}: outside production, only allowlisted addresses are emailed.`);
    return { sent: false, error: 'Blocked: this address is not on the development allowlist.' };
  }

  const from = env.EMAIL_FROM?.trim();
  if (!from) return { sent: false, error: 'EMAIL_FROM is not set, so there is nobody to send from.' };

  const message: EmailMessage = {
    to: request.to.trim(),
    subject: request.subject,
    html: request.html,
    // Every email gets a plain-text alternative. Some clients only show that
    // one, and an empty one is a common reason mail is marked as spam.
    text: request.text?.trim() || htmlToText(request.html),
    ...(request.replyTo ? { replyTo: request.replyTo } : {}),
    ...(request.attachments?.length
      ? {
          attachments: request.attachments.map((file) => ({
            filename: file.filename.trim(),
            content: file.content,
            ...(file.contentType ? { contentType: file.contentType } : {}),
          })),
        }
      : {}),
  };

  const provider = options.provider ?? providerFromEnv(env);
  return provider.send(message, from);
}
