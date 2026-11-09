import { createHash } from 'node:crypto';

import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  MAX_REQUESTS,
  RATE_WINDOW_MINUTES,
  TOKEN_MINUTES,
  isSpendable,
  resetTokenHash,
} from '@/components/password_reset/tokens';
import { resetCompletedEmail, resetRequestEmail } from '@/components/password_reset/reset-email';

/**
 * The contract for resetting a password.
 *
 * Like the sign-in contract, most of these run without a database. The rules
 * that decide whether a stolen or stale link works are pure, and pure rules can
 * be checked on every build rather than only when somebody has a server
 * running.
 *
 * The routes themselves are checked against a real database with
 * CONTRACT_TEST_DATABASE=1: the same answer for every address, a link that
 * works once and expires, every session signed out, the per-account limit, and
 * the link never written to the logs except as the email itself.
 */

describe('reset links are stored like passwords', () => {
  it('stores a hash rather than the link value', () => {
    const token = 'a-reset-token-from-an-email';
    const stored = resetTokenHash(token);
    expect(stored).not.toContain(token);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives the same token the same hash, so it can be looked up', () => {
    expect(resetTokenHash('abc')).toBe(resetTokenHash('abc'));
  });

  it('gives different tokens different hashes', () => {
    expect(resetTokenHash('abc')).not.toBe(resetTokenHash('abd'));
  });
});

describe('when a link may be spent', () => {
  const future = () => new Date(Date.now() + 60_000);
  const past = () => new Date(Date.now() - 1);

  it('accepts one that is unused and in date', () => {
    expect(isSpendable({ expiresAt: future(), usedAt: null })).toBe(true);
  });

  it('refuses one that has already been used', () => {
    // The whole point of single use: a link read from a mailbox after the
    // owner has already reset must not work a second time.
    expect(isSpendable({ expiresAt: future(), usedAt: new Date() })).toBe(false);
  });

  it('refuses one that has expired', () => {
    expect(isSpendable({ expiresAt: past(), usedAt: null })).toBe(false);
  });

  it('refuses one that is both expired and used', () => {
    expect(isSpendable({ expiresAt: past(), usedAt: new Date() })).toBe(false);
  });

  it('refuses one expiring exactly now rather than allowing it', () => {
    const now = new Date();
    expect(isSpendable({ expiresAt: now, usedAt: null }, now)).toBe(false);
  });
});

describe('the settings are not accidentally permissive', () => {
  it('expires links in hours, not days', () => {
    expect(TOKEN_MINUTES).toBeGreaterThan(0);
    expect(TOKEN_MINUTES).toBeLessThanOrEqual(24 * 60);
  });

  it('limits how much mail one account can be sent', () => {
    expect(MAX_REQUESTS).toBeGreaterThanOrEqual(1);
    expect(MAX_REQUESTS).toBeLessThanOrEqual(20);
    expect(RATE_WINDOW_MINUTES).toBeGreaterThan(0);
  });
});

describe('the emails say the things that matter', () => {
  const link = 'https://example.com/reset-password?token=abc123';

  it('tells somebody who did not ask that ignoring it is safe', () => {
    // Without this sentence, a person who did not request a reset clicks the
    // link to find out what it is — which is the behaviour phishing relies on.
    const { html } = resetRequestEmail({ resetUrl: link, minutes: 60 });
    expect(html).toMatch(/was not you/i);
    expect(html).toMatch(/ignore/i);
  });

  it('says the link expires, and when', () => {
    const { html } = resetRequestEmail({ resetUrl: link, minutes: 45 });
    expect(html).toMatch(/45 minutes/);
    expect(html).toMatch(/once/i);
  });

  it('carries the link itself', () => {
    expect(resetRequestEmail({ resetUrl: link, minutes: 60 }).html).toContain(link);
  });

  it('escapes a url rather than letting it close the attribute', () => {
    const nasty = 'https://example.com/?t="><script>alert(1)</script>';
    const { html } = resetRequestEmail({ resetUrl: nasty, minutes: 60 });
    expect(html).not.toContain('<script>');
    expect(html).toContain('&quot;');
  });

  it('warns after the change, which is what reaches a real victim', () => {
    const { html, subject } = resetCompletedEmail({ appUrl: 'https://example.com' });
    expect(subject).toMatch(/password was changed/i);
    expect(html).toMatch(/not you/i);
    // It must also say the other sessions are gone, because that is the
    // reassurance that stops somebody panicking and changing it again.
    expect(html).toMatch(/signed out/i);
  });
});

/** Opt-in, as for the database foundation: CONTRACT_TEST_DATABASE=1 npm run test:contracts */
const useDatabase = process.env.CONTRACT_TEST_DATABASE === '1';

describe.skipIf(!useDatabase)('the routes, against a real database', () => {
  const STAMP = `${Date.now()}`;
  const KNOWN = `reset-contract-${STAMP}@example.test`;
  const UNKNOWN = `nobody-${STAMP}@example.test`;
  const OLD_PASSWORD = 'Old harbour lamp 4 river';
  const NEW_PASSWORD = 'New quiet orchard 7 bridge';

  let prisma: (typeof import('@/lib/prisma'))['prisma'];
  let requestReset: (typeof import('@/app/api/auth/password-reset/request/route'))['POST'];
  let confirmReset: (typeof import('@/app/api/auth/password-reset/confirm/route'))['POST'];
  let tokens: typeof import('@/components/password_reset/tokens');
  let verifyPassword: (typeof import('@/components/auth/password'))['verifyPassword'];
  let NextRequest: (typeof import('next/server'))['NextRequest'];
  let userId = '';
  const ENV_KEYS = ['EMAIL_FROM', 'APP_URL', 'EMAIL_PROVIDER', 'EMAIL_API_KEY', 'EMAIL_ALLOWLIST'] as const;
  const savedEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));
  /** Everything the app wrote to the console during a case. */
  let logged: string[] = [];

  const post = (route: 'request' | 'confirm', body: unknown) =>
    new NextRequest(`http://localhost:3000/api/auth/password-reset/${route}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    });

  /** The link from the email the console provider printed: the dev mailbox. */
  const linkFromMailbox = (): string | null => {
    const email = logged.find((line) => line.includes('Reset your password') && line.includes('token='));
    const match = email ? /[?&]token=([A-Za-z0-9_%-]+)/.exec(email) : null;
    return match ? decodeURIComponent(match[1] ?? '') : null;
  };

  beforeAll(async () => {
    ({ prisma } = await import('@/lib/prisma'));
    ({ POST: requestReset } = await import('@/app/api/auth/password-reset/request/route'));
    ({ POST: confirmReset } = await import('@/app/api/auth/password-reset/confirm/route'));
    tokens = await import('@/components/password_reset/tokens');
    const password = await import('@/components/auth/password');
    verifyPassword = password.verifyPassword;
    ({ NextRequest } = await import('next/server'));
    const user = await prisma.user.create({
      data: { email: KNOWN, passwordHash: await password.hashPassword(OLD_PASSWORD) },
    });
    userId = user.id;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of ENV_KEYS) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
    await prisma.session.deleteMany({ where: { userId } });
    await prisma.user.deleteMany({ where: { email: KNOWN } });
  });

  /** Capture the console, and let the dev mailbox deliver to example.test only. */
  function watch(mail: 'delivered' | 'blocked' = 'delivered'): void {
    vi.restoreAllMocks();
    logged = [];
    for (const level of ['log', 'info', 'warn', 'error', 'debug'] as const) {
      vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
        logged.push(args.map(String).join(' '));
      });
    }
    process.env.EMAIL_FROM = 'noreply@example.test';
    process.env.APP_URL = 'http://localhost:3000';
    process.env.EMAIL_PROVIDER = 'console';
    delete process.env.EMAIL_API_KEY;
    if (mail === 'delivered') process.env.EMAIL_ALLOWLIST = '@example.test';
    else delete process.env.EMAIL_ALLOWLIST;
  }

  async function freshStart(): Promise<void> {
    await prisma.passwordResetToken.deleteMany({ where: { userId } });
  }

  it('gives a known address, an unknown one and junk the same answer', async () => {
    await freshStart();
    watch();
    const answers = [
      await requestReset(post('request', { email: KNOWN })),
      await requestReset(post('request', { email: UNKNOWN })),
      await requestReset(post('request', 'not json')),
    ];
    const bodies = await Promise.all(answers.map((response) => response.text()));
    expect(answers.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(new Set(bodies).size).toBe(1);
    expect(bodies[0]).not.toMatch(/token|reset-password\?/);
    // Only the real account was sent anything.
    expect(await prisma.passwordResetToken.count({ where: { userId } })).toBe(1);
  });

  it('emails a link, and stores only its hash', async () => {
    await freshStart();
    watch();
    await requestReset(post('request', { email: KNOWN }));
    const token = linkFromMailbox();
    expect(token, 'no reset email reached the dev mailbox').toBeTruthy();
    const rows = await prisma.passwordResetToken.findMany({ where: { userId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.tokenHash).toBe(createHash('sha256').update(token ?? '').digest('hex'));
    expect(rows[0]?.tokenHash).not.toBe(token);
  });

  it('never writes the link to the logs, except as the email in the dev mailbox', async () => {
    await freshStart();
    watch('blocked');
    await requestReset(post('request', { email: KNOWN }));
    expect(logged.join('\n')).not.toMatch(/token=/);

    watch('delivered');
    await requestReset(post('request', { email: KNOWN }));
    const withLink = logged.filter((line) => /token=/.test(line));
    expect(withLink).toHaveLength(1);
    expect(withLink[0]).toContain('email (not sent)');
  });

  it('works once, changes the password and signs every session out', async () => {
    await freshStart();
    watch();
    for (const n of [1, 2]) {
      await prisma.session.create({
        data: {
          userId,
          tokenHash: createHash('sha256').update(`contract-session-${STAMP}-${n}`).digest('hex'),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
    }
    await requestReset(post('request', { email: KNOWN }));
    const token = linkFromMailbox() ?? '';

    const first = await confirmReset(post('confirm', { token, password: NEW_PASSWORD }));
    expect(first.status).toBe(200);
    expect(await prisma.session.count({ where: { userId, revokedAt: null } })).toBe(0);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword(NEW_PASSWORD, user.passwordHash)).toBe(true);
    expect(await verifyPassword(OLD_PASSWORD, user.passwordHash)).toBe(false);

    const second = await confirmReset(post('confirm', { token, password: OLD_PASSWORD }));
    expect(second.status).toBe(400);
    const after = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword(NEW_PASSWORD, after.passwordHash)).toBe(true);
  });

  it('refuses an expired link that was never used', async () => {
    await freshStart();
    watch();
    const { token } = await tokens.issueResetToken(userId);
    await prisma.passwordResetToken.updateMany({
      where: { userId, usedAt: null },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const response = await confirmReset(post('confirm', { token, password: 'Another long phrase 9 meadow' }));
    expect(response.status).toBe(400);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(await verifyPassword(NEW_PASSWORD, user.passwordHash)).toBe(true);
  });

  it('kills an older link when a newer one is sent', async () => {
    await freshStart();
    watch();
    const older = await tokens.issueResetToken(userId);
    await tokens.issueResetToken(userId);
    const response = await confirmReset(post('confirm', { token: older.token, password: 'Another long phrase 9 meadow' }));
    expect(response.status).toBe(400);
  });

  it('stops issuing links after the limit, and still says the same thing', async () => {
    await freshStart();
    watch();
    const bodies: string[] = [];
    for (let n = 0; n < tokens.MAX_REQUESTS + 2; n += 1) {
      const response = await requestReset(post('request', { email: KNOWN }));
      expect(response.status).toBe(200);
      bodies.push(await response.text());
    }
    expect(new Set(bodies).size).toBe(1);
    expect(await prisma.passwordResetToken.count({ where: { userId } })).toBe(tokens.MAX_REQUESTS);
  });
});
