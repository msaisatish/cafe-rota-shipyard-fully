/**
 * The email provider, behind a door you can change.
 *
 * Every provider does the same three things — take an address, a subject and a
 * body, and either accept it or say why not. Putting that behind one interface
 * means switching from one to another is a line of configuration rather than a
 * search through the codebase, which matters because free tiers change and
 * deliverability problems are usually solved by moving.
 */

/** A file sent with the email, such as a PDF invoice (1.4.0). */
export interface EmailAttachment {
  /** The name the person sees, such as `invoice-1042.pdf`. */
  filename: string;
  /** The file itself. A Node.js Buffer is one of these. */
  content: Uint8Array;
  /** Such as `application/pdf`. When left out, the provider works it out from the name. */
  contentType?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

/** Sizes the way a person reads them: `12.3 KB`. */
export function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface SendOutcome {
  sent: boolean;
  /** The provider's id for the message, when it gives one. */
  id?: string;
  /** Safe to show a developer. Never contains the API key. */
  error?: string;
}

export interface EmailProvider {
  name: string;
  send(message: EmailMessage, from: string): Promise<SendOutcome>;
}

/**
 * The default until a key is set: print it, do not send it.
 *
 * This is what stops the classic accident of a test run emailing real
 * customers. It is the default rather than an option because the accident
 * happens when somebody has not thought about it yet.
 *
 * In production the body is not printed. A published app with no email
 * account still lands here, and its output goes to the hosting logs, where a
 * password reset link printed in full is a working key to somebody's account
 * for anyone who can read them. On your own computer the printed email is the
 * development mailbox, and the link is what you need.
 */
export const consoleProvider: EmailProvider = {
  name: 'console',
  async send(message, from) {
    const body =
      process.env.NODE_ENV === 'production'
        ? '(The message is not shown here in production: it may hold a sign-in or reset link. Set up an email account to send it.)'
        : message.text;
    // Attachments are named, never printed: a PDF in the console is noise, and
    // an invoice in the hosting logs is somebody's bill.
    const attached = (message.attachments ?? []).map(
      (file) => `attached: ${file.filename} (${readableSize(file.content.byteLength)})`,
    );
    console.info(
      ['', '── email (not sent) ──', `from:    ${from}`, `to:      ${message.to}`, `subject: ${message.subject}`, ...attached, '', body, '──────────────────────', ''].join('\n'),
    );
    return { sent: true, id: 'console' };
  },
};

/** Resend, written against their documented HTTP API. */
export function resendProvider(apiKey: string): EmailProvider {
  return {
    name: 'resend',
    async send(message, from) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from,
            to: [message.to],
            subject: message.subject,
            html: message.html,
            text: message.text,
            ...(message.replyTo ? { reply_to: message.replyTo } : {}),
            // Resend takes each file as base64 text. Written against their
            // documented API; not yet sent to a live account (see the README).
            ...(message.attachments?.length
              ? {
                  attachments: message.attachments.map((file) => ({
                    filename: file.filename,
                    content: Buffer.from(file.content).toString('base64'),
                    ...(file.contentType ? { content_type: file.contentType } : {}),
                  })),
                }
              : {}),
          }),
        });

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          // The status and the provider's message, and nothing else. Echoing
          // the request back would put the API key in a log line.
          return { sent: false, error: `Resend refused it (${response.status}): ${body.slice(0, 200)}` };
        }

        const body = (await response.json().catch(() => ({}))) as { id?: string };
        return { sent: true, id: body.id };
      } catch (error) {
        return { sent: false, error: error instanceof Error ? error.message : 'Could not reach the email provider.' };
      }
    },
  };
}

/** Pick a provider from the environment. */
export function providerFromEnv(env: NodeJS.ProcessEnv = process.env): EmailProvider {
  const key = env.EMAIL_API_KEY?.trim();
  const named = env.EMAIL_PROVIDER?.trim().toLowerCase();

  // No key means no sending, whatever the provider is set to. Failing over to
  // the console is the safe direction: the worst case is an email nobody
  // receives, rather than one that reaches the wrong person.
  if (!key) return consoleProvider;
  if (named === 'console') return consoleProvider;
  if (named === 'resend' || named === undefined || named === '') return resendProvider(key);

  console.warn(`[email] unknown provider "${named}" — printing to the console instead of sending.`);
  return consoleProvider;
}
