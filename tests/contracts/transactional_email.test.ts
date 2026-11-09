import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import { htmlToText, looksLikeAnAddress, mayEmail, MAX_ATTACHMENT_BYTES, sendEmail } from '@/components/transactional_email/email';
import {
  consoleProvider,
  providerFromEnv,
  resendProvider,
  type EmailMessage,
  type EmailProvider,
} from '@/components/transactional_email/providers';
import { escape, welcomeEmail } from '@/components/transactional_email/templates';

import { sendEmail as seamSendEmail } from '@/seams/email';

/** Read as text, to check the stub marker is gone. Its absence is what stops
 *  a later install overwriting a file that now holds real behaviour. */
const seamSource = readFileSync(path.join(process.cwd(), 'src', 'seams', 'email.ts'), 'utf8');

/** A provider that records rather than sends, so the tests never leave the machine. */
function recorder(): EmailProvider & { sent: { to: string; subject: string; from: string }[] } {
  const sent: { to: string; subject: string; from: string }[] = [];
  return {
    name: 'recorder',
    sent,
    async send(message, from) {
      sent.push({ to: message.to, subject: message.subject, from });
      return { sent: true, id: 'rec_1' };
    },
  };
}

const production = { NODE_ENV: 'production', EMAIL_FROM: 'hello@example.com' } as unknown as NodeJS.ProcessEnv;

describe('who may be emailed', () => {
  it('nobody, by default, outside production', () => {
    // The accident this prevents: a seed script emailing real customers.
    expect(mayEmail('someone@real-customer.com', { NODE_ENV: 'development' } as unknown as NodeJS.ProcessEnv)).toBe(false);
  });

  it('only the addresses on the allowlist', () => {
    const env = { NODE_ENV: 'development', EMAIL_ALLOWLIST: 'me@example.com' } as unknown as NodeJS.ProcessEnv;
    expect(mayEmail('me@example.com', env)).toBe(true);
    expect(mayEmail('someone@real-customer.com', env)).toBe(false);
  });

  it('supports a whole domain', () => {
    const env = { NODE_ENV: 'development', EMAIL_ALLOWLIST: '@example.com' } as unknown as NodeJS.ProcessEnv;
    expect(mayEmail('anyone@example.com', env)).toBe(true);
    expect(mayEmail('anyone@elsewhere.com', env)).toBe(false);
  });

  it('everybody, in production', () => {
    expect(mayEmail('someone@real-customer.com', production)).toBe(true);
  });
});

describe('addresses', () => {
  it('accepts an ordinary one', () => {
    expect(looksLikeAnAddress('sam@example.com')).toBe(true);
  });

  it('rejects nonsense', () => {
    for (const bad of ['', 'sam', 'sam@', '@example.com', 'sam @example.com', 'sam@example']) {
      expect(looksLikeAnAddress(bad)).toBe(false);
    }
  });

  it('rejects one with a newline in it', () => {
    // A line break in an address field is how extra headers get injected.
    expect(looksLikeAnAddress('sam@example.com\nBcc: everyone@example.com')).toBe(false);
  });
});

describe('sending', () => {
  it('refuses a subject containing a line break', async () => {
    const outcome = await sendEmail(
      { to: 'sam@example.com', subject: 'Hi\nBcc: everyone@example.com', html: '<p>x</p>' },
      { provider: recorder(), env: production },
    );
    expect(outcome.sent).toBe(false);
    expect(outcome.error).toMatch(/line break/);
  });

  it('refuses when there is nobody to send from', async () => {
    const outcome = await sendEmail(
      { to: 'sam@example.com', subject: 'Hi', html: '<p>x</p>' },
      { provider: recorder(), env: { NODE_ENV: 'production' } as unknown as NodeJS.ProcessEnv },
    );
    expect(outcome.sent).toBe(false);
    expect(outcome.error).toMatch(/EMAIL_FROM/);
  });

  it('always attaches a plain-text version', async () => {
    const provider = recorder();
    const captured: string[] = [];
    const wrapped: EmailProvider = {
      name: 'x',
      async send(message, from) {
        captured.push(message.text);
        return provider.send(message, from);
      },
    };
    await sendEmail(
      { to: 'sam@example.com', subject: 'Hi', html: '<h1>Hello</h1><p>There</p>' },
      { provider: wrapped, env: production },
    );
    expect(captured[0]).toContain('Hello');
    expect(captured[0]).not.toContain('<h1>');
  });

  it('sends when everything is in order', async () => {
    const provider = recorder();
    const outcome = await sendEmail(
      { to: 'sam@example.com', subject: 'Hi', html: '<p>x</p>' },
      { provider, env: production },
    );
    expect(outcome.sent).toBe(true);
    expect(provider.sent[0]).toEqual({ to: 'sam@example.com', subject: 'Hi', from: 'hello@example.com' });
  });
});

describe('choosing a provider', () => {
  it('prints to the console when no key is set', () => {
    expect(providerFromEnv({} as unknown as NodeJS.ProcessEnv).name).toBe('console');
  });

  it('prints to the console even when a provider is named, if there is no key', () => {
    // Failing towards "nobody receives it" rather than "the wrong person does".
    expect(providerFromEnv({ EMAIL_PROVIDER: 'resend' } as unknown as NodeJS.ProcessEnv).name).toBe('console');
  });

  it('uses the provider once a key exists', () => {
    expect(providerFromEnv({ EMAIL_API_KEY: 'k', EMAIL_PROVIDER: 'resend' } as unknown as NodeJS.ProcessEnv).name).toBe('resend');
  });

  it('falls back rather than throwing on an unknown provider', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(providerFromEnv({ EMAIL_API_KEY: 'k', EMAIL_PROVIDER: 'pigeon' } as unknown as NodeJS.ProcessEnv).name).toBe('console');
    warn.mockRestore();
  });

  it('the console provider never claims a message left the building', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const outcome = await consoleProvider.send(
      { to: 'a@b.com', subject: 's', html: '<p>h</p>', text: 't' },
      'from@example.com',
    );
    expect(outcome.id).toBe('console');
    info.mockRestore();
  });

  it('prints the message in development, which is the dev mailbox', async () => {
    const lines: string[] = [];
    const info = vi.spyOn(console, 'info').mockImplementation((line: unknown) => void lines.push(String(line)));
    vi.stubEnv('NODE_ENV', 'development');
    try {
      await consoleProvider.send(
        { to: 'a@b.com', subject: 's', html: '', text: 'Choose a new password (https://x.test/reset-password?token=dev123)' },
        'from@example.com',
      );
    } finally {
      vi.unstubAllEnvs();
      info.mockRestore();
    }
    expect(lines.join('\n')).toContain('token=dev123');
  });

  it('never prints the message in production, where the output is the hosting logs', async () => {
    const lines: string[] = [];
    const info = vi.spyOn(console, 'info').mockImplementation((line: unknown) => void lines.push(String(line)));
    vi.stubEnv('NODE_ENV', 'production');
    try {
      await consoleProvider.send(
        { to: 'a@b.com', subject: 'Reset your password', html: '', text: 'Choose a new password (https://x.test/reset-password?token=live456)' },
        'from@example.com',
      );
    } finally {
      vi.unstubAllEnvs();
      info.mockRestore();
    }
    expect(lines.join('\n')).not.toContain('live456');
    expect(lines.join('\n')).toContain('Reset your password');
  });
});

describe('templates', () => {
  it('escapes anything a user typed', () => {
    const email = welcomeEmail({ name: '<script>alert(1)</script>', appUrl: 'https://example.com' });
    expect(email.html).not.toContain('<script>');
    expect(email.html).toContain('&lt;script&gt;');
  });

  it('copes with no name at all', () => {
    expect(welcomeEmail({ name: null, appUrl: 'https://example.com' }).html).toContain('Hello');
  });

  it('escapes the characters that matter', () => {
    expect(escape('a & b < c > "d"')).toBe('a &amp; b &lt; c &gt; &quot;d&quot;');
  });
});

describe('plain text', () => {
  it('turns list items into bullets', () => {
    expect(htmlToText('<ul><li>one</li><li>two</li></ul>')).toContain('• one');
  });

  it('collapses runs of blank lines', () => {
    expect(htmlToText('<p>a</p><p></p><p></p><p>b</p>')).toBe('a\n\nb');
  });
});

describe('the email seam, once this component fills it', () => {
  /**
   * The seam returns an outcome rather than throwing. Most mail is sent
   * alongside something that already succeeded — the account exists, the
   * invoice is paid — and throwing here would 500 a request whose real work was
   * done. The caller decides whether an unsent message matters enough to fail
   * on, and for a password reset it usually does.
   */
  it('reports a refusal rather than throwing it', async () => {
    const outcome = await seamSendEmail({ to: 'not-an-address', subject: 'Hello', html: '<p>Hi</p>' });
    expect(outcome.sent).toBe(false);
    expect(outcome.error).toBeTruthy();
  });

  it('still refuses a subject line carrying a header injection', async () => {
    const outcome = await seamSendEmail({
      to: 'someone@example.com',
      subject: 'Hello\r\nBcc: everyone@example.com',
      html: '<p>Hi</p>',
    });
    expect(outcome.sent).toBe(false);
  });

  it('hands back only what the seam promises', async () => {
    // A caller written against the seam must not come to depend on something
    // only this provider returns, or swapping the provider breaks them.
    const outcome = await seamSendEmail({ to: 'nope', subject: 'x', html: 'y' });
    expect(Object.keys(outcome).sort()).toEqual(['error', 'sent']);
  });

  it('no longer advertises itself as a stub', () => {
    expect(seamSource).not.toContain('SHIPYARD_SEAM_STUB');
  });
});

describe('the plain-text alternative keeps what the words point at', () => {
  /**
   * The text version of a password reset email said "Choose a new password" and
   * contained no link, because stripping tags threw the `href` away. The HTML
   * was fine, the email was sent, and the existing tests checked the text had no
   * tags in it — so nothing failed and nobody could reset their password from a
   * client that shows text/plain.
   */
  it('keeps a link address, not only the words that were linked', () => {
    const text = htmlToText('<p><a href="https://app.example/reset?token=abc">Choose a new password</a></p>');
    expect(text).toContain('https://app.example/reset?token=abc');
    expect(text).toContain('Choose a new password');
  });

  it('decodes an escaped ampersand in the address, so the link still works', () => {
    // A URL with two parameters is escaped to `&amp;` in the HTML. Left encoded
    // in the text version it is a link to a different page.
    const text = htmlToText('<a href="https://app.example/r?token=abc&amp;lang=en">Reset</a>');
    expect(text).toContain('https://app.example/r?token=abc&lang=en');
  });

  it('does not print the address twice when that is also the link text', () => {
    const text = htmlToText('<a href="https://app.example/r">https://app.example/r</a>');
    expect(text.match(/https:\/\/app\.example\/r/g)).toHaveLength(1);
  });

  it('still leaves no markup behind', () => {
    const text = htmlToText('<p>Hello <strong>you</strong>, <a href="https://x.example">go</a>.</p>');
    expect(text).not.toMatch(/<[a-z/]/i);
  });
});

describe('the address survives the whole conversion, not just the link step', () => {
  /**
   * Worth its own case because the first attempt at keeping the URL wrote it as
   * `text <url>`, which is the usual convention — and the tag stripper further
   * down the same chain removed `<https://...>` as though it were a tag. The
   * link step was correct, the output was identical to before the fix, and only
   * running the flow showed it.
   */
  it('is still there after the tags have been stripped', () => {
    const text = htmlToText('<p><a href="https://app.example/r?t=1">Reset</a></p>');
    expect(text).toContain('https://app.example/r?t=1');
    expect(text).not.toMatch(/<|>/);
  });
});

describe('sending a file with an email', () => {
  /**
   * Before 1.4.0 there was nowhere to put a file, so "email a PDF to a
   * customer" could not be done. The Resend case checks what would be sent,
   * against a stand-in for the network; no live Resend account has received
   * one (see the README).
   */
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]); // "%PDF-"
  const invoice = { filename: 'invoice-1042.pdf', content: pdf, contentType: 'application/pdf' };

  function capturing(): EmailProvider & { messages: EmailMessage[] } {
    const messages: EmailMessage[] = [];
    return {
      name: 'capturing',
      messages,
      async send(message) {
        messages.push(message);
        return { sent: true, id: 'cap_1' };
      },
    };
  }

  it('hands a PDF to the provider with the email', async () => {
    const provider = capturing();
    const outcome = await sendEmail(
      { to: 'sam@example.com', subject: 'Your invoice', html: '<p>Attached.</p>', attachments: [invoice] },
      { provider, env: production },
    );
    expect(outcome.sent).toBe(true);
    expect(provider.messages[0]?.attachments).toEqual([invoice]);
  });

  it('sends it to Resend as a named file', async () => {
    const requests: { url: string; body: Record<string, unknown> }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: { body: string }) => {
        requests.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
        return new Response(JSON.stringify({ id: 're_1' }), { status: 200 });
      }),
    );
    try {
      const outcome = await resendProvider('contract-test-key').send(
        { to: 'sam@example.com', subject: 'Your invoice', html: '<p>x</p>', text: 'x', attachments: [invoice] },
        'hello@example.com',
      );
      expect(outcome).toEqual({ sent: true, id: 're_1' });
      expect(requests[0]?.body.attachments).toEqual([
        { filename: 'invoice-1042.pdf', content: 'JVBERi0=', content_type: 'application/pdf' },
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('refuses a file name with a line break in it', async () => {
    const outcome = await sendEmail(
      { to: 'sam@example.com', subject: 'x', html: 'y', attachments: [{ ...invoice, filename: 'a.pdf\r\nBcc: everyone@example.com' }] },
      { provider: capturing(), env: production },
    );
    expect(outcome.sent).toBe(false);
    expect(outcome.error).toMatch(/line break/);
  });

  it('refuses a file name with a folder in it', async () => {
    const outcome = await sendEmail(
      { to: 'sam@example.com', subject: 'x', html: 'y', attachments: [{ ...invoice, filename: '../secrets/invoice.pdf' }] },
      { provider: capturing(), env: production },
    );
    expect(outcome.sent).toBe(false);
  });

  it('refuses an empty file, which is nearly always one that failed to generate', async () => {
    const provider = capturing();
    const outcome = await sendEmail(
      { to: 'sam@example.com', subject: 'x', html: 'y', attachments: [{ ...invoice, content: new Uint8Array() }] },
      { provider, env: production },
    );
    expect(outcome.error).toMatch(/is empty/);
    expect(provider.messages).toHaveLength(0);
  });

  it('refuses files too large for most mailboxes, and says to send a link', async () => {
    const outcome = await sendEmail(
      {
        to: 'sam@example.com',
        subject: 'x',
        html: 'y',
        attachments: [{ ...invoice, content: new Uint8Array(MAX_ATTACHMENT_BYTES + 1) }],
      },
      { provider: capturing(), env: production },
    );
    expect(outcome.sent).toBe(false);
    expect(outcome.error).toMatch(/link to the file/);
  });

  it('the console provider names the file without printing it', async () => {
    const lines: string[] = [];
    const info = vi.spyOn(console, 'info').mockImplementation((line: unknown) => void lines.push(String(line)));
    try {
      await consoleProvider.send(
        { to: 'sam@example.com', subject: 'Your invoice', html: '<p>x</p>', text: 'x', attachments: [invoice] },
        'hello@example.com',
      );
      expect(lines.join('\n')).toContain('attached: invoice-1042.pdf (5 bytes)');
      expect(lines.join('\n')).not.toContain('%PDF');
    } finally {
      info.mockRestore();
    }
  });

  it('the seam passes a file through', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('EMAIL_API_KEY', '');
    vi.stubEnv('EMAIL_FROM', 'hello@example.com');
    vi.stubEnv('EMAIL_ALLOWLIST', 'sam@example.com');
    const lines: string[] = [];
    const info = vi.spyOn(console, 'info').mockImplementation((line: unknown) => void lines.push(String(line)));
    try {
      const outcome = await seamSendEmail({ to: 'sam@example.com', subject: 'Your invoice', html: '<p>x</p>', attachments: [invoice] });
      expect(outcome.sent).toBe(true);
      expect(lines.join('\n')).toContain('attached: invoice-1042.pdf');
    } finally {
      info.mockRestore();
      vi.unstubAllEnvs();
    }
  });
});
