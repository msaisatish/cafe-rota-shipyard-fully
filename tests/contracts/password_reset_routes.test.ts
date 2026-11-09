import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

import { sendEmail } from '@/components/transactional_email/email';
import { appAddress, resetCompletedEmail } from '@/components/password_reset/reset-email';
import { resetTokenHash } from '@/components/password_reset/tokens';
import { POST as requestReset } from '@/app/api/auth/password-reset/request/route';
import { POST as confirmReset } from '@/app/api/auth/password-reset/confirm/route';

/**
 * The two routes, against a stand-in for the database, on every build.
 *
 * The cases against a real database are in the other file and need
 * CONTRACT_TEST_DATABASE=1. These need nothing running: the database, the
 * email sender and the session store are stood in for, and the routes, the
 * token rules and the password rules are the real ones. They cover what an
 * audit (2026-11-03) found untested or unsafe: a suspended account getting a
 * link, and a link built from the request's Host header when APP_URL is empty.
 */

const db = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const users: Row[] = [];
  const tokens: Row[] = [];
  const matches = (row: Row, where: Row) =>
    Object.entries(where).every(([key, value]) =>
      value !== null && typeof value === 'object' && !(value instanceof Date) ? true : (row[key] ?? null) === value,
    );
  return {
    users,
    tokens,
    reset() {
      users.length = 0;
      tokens.length = 0;
    },
    client: {
      user: {
        findUnique: async ({ where }: { where: Row }) => {
          const row = users.find((user) => matches(user, where));
          return row ? { ...row } : null;
        },
        update: async ({ where, data }: { where: Row; data: Row }) => {
          const row = users.find((user) => matches(user, where));
          if (!row) throw new Error('Record to update not found.');
          Object.assign(row, data);
          return { ...row };
        },
      },
      passwordResetToken: {
        count: async ({ where }: { where: Row }) => tokens.filter((token) => token.userId === where.userId).length,
        create: async ({ data }: { data: Row }) => {
          tokens.push({ id: `tok_${tokens.length + 1}`, usedAt: null, createdAt: new Date(), ...data });
        },
        findUnique: async ({ where }: { where: Row }) => {
          const row = tokens.find((token) => token.tokenHash === where.tokenHash);
          return row ? { ...row } : null;
        },
        updateMany: async ({ where, data }: { where: Row; data: Row }) => {
          let count = 0;
          for (const token of tokens) {
            if (matches(token, where)) {
              Object.assign(token, data);
              count += 1;
            }
          }
          return { count };
        },
      },
    },
  };
});

vi.mock('@/lib/prisma', () => ({ prisma: db.client }));
vi.mock('@/components/transactional_email/email', () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }));
vi.mock('@/components/auth/session', () => ({ revokeAllSessions: vi.fn(async () => 2) }));
vi.mock('@/components/auth/lockout', () => ({ clearFailedSignIns: vi.fn(async () => undefined) }));

const KNOWN = 'someone@example.test';
const SUSPENDED = 'suspended@example.test';

function request(route: 'request' | 'confirm', body: unknown, host = 'localhost:3000') {
  return new NextRequest(`http://${host}/api/auth/password-reset/${route}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', host },
    body: JSON.stringify(body),
  });
}

/** The HTML of every email sent during a case. */
const sentHtml = () => vi.mocked(sendEmail).mock.calls.map(([message]) => (message as { html: string }).html);

beforeEach(() => {
  db.reset();
  db.users.push(
    { id: 'user_known', email: KNOWN, name: null, disabledAt: null },
    { id: 'user_suspended', email: SUSPENDED, name: null, disabledAt: new Date('2026-10-01T00:00:00Z') },
  );
  vi.mocked(sendEmail).mockClear();
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('a suspended account', () => {
  it('gets no link, and the same answer as anyone else', async () => {
    vi.stubEnv('APP_URL', 'https://app.example.com');
    const suspended = await requestReset(request('request', { email: SUSPENDED }));
    const unknown = await requestReset(request('request', { email: 'nobody@example.test' }));

    expect(suspended.status).toBe(200);
    expect(await suspended.text()).toBe(await unknown.text());
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.tokens).toHaveLength(0);
  });
});

describe('the address the reset link points at', () => {
  it('is APP_URL, never the Host header the request came with', async () => {
    vi.stubEnv('APP_URL', 'https://app.example.com/');
    await requestReset(request('request', { email: KNOWN }, 'attacker.example'));

    const html = sentHtml();
    expect(html).toHaveLength(1);
    expect(html[0]).toContain('https://app.example.com/reset-password?token=');
    expect(html[0]).not.toContain('attacker.example');
  });

  it('in production, no link is sent while APP_URL is missing, and the answer is the same', async () => {
    vi.stubEnv('APP_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    const known = await requestReset(request('request', { email: KNOWN }, 'attacker.example'));
    const unknown = await requestReset(request('request', { email: 'nobody@example.test' }, 'attacker.example'));

    expect(known.status).toBe(200);
    expect(await known.text()).toBe(await unknown.text());
    expect(sendEmail).not.toHaveBeenCalled();
    expect(db.tokens).toHaveLength(0);
    expect(vi.mocked(console.error).mock.calls.join(' ')).toMatch(/APP_URL/);
  });

  it('during development, falls back to the address the app is running on', async () => {
    vi.stubEnv('APP_URL', '   ');
    vi.stubEnv('NODE_ENV', 'development');
    await requestReset(request('request', { email: KNOWN }));
    expect(sentHtml()[0]).toContain('http://localhost:3000/reset-password?token=');
  });

  it('an empty APP_URL counts as unset', () => {
    expect(appAddress('', 'http://localhost:3000', false)).toBe('http://localhost:3000');
    expect(appAddress('   ', 'http://localhost:3000', true)).toBeNull();
    expect(appAddress(undefined, 'http://localhost:3000', true)).toBeNull();
  });

  it('an APP_URL that is not a web address is refused', () => {
    expect(appAddress('app.example.com', 'http://localhost:3000', false)).toBeNull();
    expect(appAddress('javascript:alert(1)', 'http://localhost:3000', false)).toBeNull();
  });
});

describe('the warning sent after a change', () => {
  it('in production without APP_URL, still goes, but links nowhere', async () => {
    vi.stubEnv('APP_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    const token = 'a-reset-token-from-an-email';
    db.tokens.push({
      id: 'tok_1',
      userId: 'user_known',
      tokenHash: resetTokenHash(token),
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
      createdAt: new Date(),
    });

    const response = await confirmReset(
      request('confirm', { token, password: 'New quiet orchard 7 bridge' }, 'attacker.example'),
    );
    expect(response.status).toBe(200);
    const html = sentHtml();
    expect(html).toHaveLength(1);
    expect(html[0]).toMatch(/password has just been changed/);
    expect(html[0]).not.toContain('attacker.example');
    expect(html[0]).not.toContain('href=');
  });

  it('links to APP_URL when it is set', () => {
    expect(resetCompletedEmail({ appUrl: 'https://app.example.com' }).html).toContain('href="https://app.example.com"');
    expect(resetCompletedEmail({ appUrl: null }).html).toMatch(/sign in\s+with your new password/);
  });
});
