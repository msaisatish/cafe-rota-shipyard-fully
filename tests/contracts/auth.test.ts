import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkPassword, hashPassword, normaliseEmail, verifyPassword } from '@/components/auth/password';
import {
  LOCKOUT_SETTINGS,
  afterFailure,
  attemptKey,
  isLockedOut,
  lockoutMinutesRemaining,
} from '@/components/auth/lockout';
import { sameToken, sessionTokenHash } from '@/components/auth/session';

/**
 * The contract for sign-in.
 *
 * These are the cases that decide whether the component is safe rather than
 * merely working. They run without a database on purpose: the logic that stops
 * an attacker is pure, and pure logic can be checked on every build instead of
 * only when someone has a database running.
 */

describe('password rules', () => {
  it('refuses a short password', () => {
    expect(checkPassword('Sh0rt!').ok).toBe(false);
  });

  it('refuses one of the first passwords anyone would try', () => {
    expect(checkPassword('password123').ok).toBe(false);
  });

  it('refuses a password containing the email address', () => {
    const result = checkPassword('jasmine-2026-summer', { email: 'jasmine@example.com' });
    expect(result.ok).toBe(false);
    expect(result.issues.join(' ')).toMatch(/email/i);
  });

  it('refuses a password containing the person’s name', () => {
    expect(checkPassword('Priya!Priya!2026', { name: 'Priya' }).ok).toBe(false);
  });

  it('refuses a long run of the same character', () => {
    expect(checkPassword('Aaaaaaaaaaaa1!').ok).toBe(false);
  });

  it('refuses one that is long but has no variety', () => {
    expect(checkPassword('aaabbbcccdddeee').ok).toBe(false);
  });

  it('accepts a reasonable one', () => {
    expect(checkPassword('Harbour-Kettle-91', { email: 'sam@example.com' }).ok).toBe(true);
  });

  it('refuses one longer than bcrypt actually reads', () => {
    // bcrypt ignores everything past 72 bytes. Accepting a 200-character
    // password would mean silently only checking the first 72.
    expect(checkPassword(`${'Harbour-Kettle-91'.repeat(10)}`).ok).toBe(false);
  });

  it('says what is wrong in words a person can act on', () => {
    const issues = checkPassword('abc').issues.join(' ');
    expect(issues).not.toMatch(/regex|policy violation|ERR_/);
    expect(issues).toMatch(/at least 12 characters/);
  });
});

describe('password storage', () => {
  it('never stores the password itself', async () => {
    const hash = await hashPassword('Harbour-Kettle-91');
    expect(hash).not.toContain('Harbour-Kettle-91');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('accepts the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('Harbour-Kettle-91');
    expect(await verifyPassword('Harbour-Kettle-91', hash)).toBe(true);
    expect(await verifyPassword('Harbour-Kettle-92', hash)).toBe(false);
  });

  it('treats a corrupted hash as a failed sign-in rather than an error', async () => {
    await expect(verifyPassword('anything', 'not-a-hash')).resolves.toBe(false);
  });

  it('is not case sensitive about email addresses', () => {
    expect(normaliseEmail('  Sam@Example.COM ')).toBe('sam@example.com');
  });
});

describe('sessions', () => {
  it('stores a hash rather than the token', () => {
    const token = 'a-session-token';
    const stored = sessionTokenHash(token);
    expect(stored).not.toContain(token);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
  });

  it('gives the same token the same hash', () => {
    expect(sessionTokenHash('abc')).toBe(sessionTokenHash('abc'));
  });

  it('compares tokens without giving away where they differ', () => {
    expect(sameToken('abc', 'abc')).toBe(true);
    expect(sameToken('abc', 'abd')).toBe(false);
    expect(sameToken('abc', 'abcd')).toBe(false);
  });
});

describe('locking an account', () => {
  it('is not locked when nothing has gone wrong', () => {
    expect(isLockedOut({ lockedUntil: null })).toBe(false);
  });

  it('is locked while the lock is in the future', () => {
    expect(isLockedOut({ lockedUntil: new Date(Date.now() + 60_000) })).toBe(true);
  });

  it('unlocks itself once the time has passed', () => {
    expect(isLockedOut({ lockedUntil: new Date(Date.now() - 1) })).toBe(false);
  });

  it('can say how long is left, rounded up', () => {
    expect(lockoutMinutesRemaining({ lockedUntil: new Date(Date.now() + 61_000) })).toBe(2);
    expect(lockoutMinutesRemaining({ lockedUntil: null })).toBe(0);
  });

  it('never allows an unlimited number of attempts', () => {
    expect(LOCKOUT_SETTINGS.maxAttempts).toBeGreaterThanOrEqual(1);
    expect(LOCKOUT_SETTINGS.lockoutMs).toBeGreaterThanOrEqual(60_000);
  });

  it('locks on the last allowed failure, not before', () => {
    const max = LOCKOUT_SETTINGS.maxAttempts;
    expect(afterFailure(max - 2).lockedUntil).toBeNull();
    expect(afterFailure(max - 1).lockedUntil).not.toBeNull();
  });

  it('counts one address once, however it is typed', () => {
    expect(attemptKey('  Priya@Example.COM ')).toBe(attemptKey('priya@example.com'));
    expect(attemptKey('priya@example.com')).not.toContain('priya');
  });
});

/*
 * The sign-in route itself, against a stand-in for the database.
 *
 * Counting failures only on real accounts made a real address say "too many
 * attempts" after a few wrong passwords while an unknown one never did: five
 * guesses told anyone who had an account (founder test, 2026-10-27). The route
 * must answer an unknown address exactly as it answers a real one, try for try.
 */
const db = vi.hoisted(() => {
  type Attempt = { key: string; failures: number; lockedUntil: Date | null };
  type User = { id: string; email: string; passwordHash: string; disabledAt: Date | null };
  const users = new Map<string, User>();
  const attempts = new Map<string, Attempt>();
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => users.get(where.email) ?? null,
    },
    loginAttempt: {
      findUnique: async ({ where }: { where: { key: string } }) => attempts.get(where.key) ?? null,
      upsert: async ({ where, create, update }: { where: { key: string }; create: Attempt; update: Partial<Attempt> }) => {
        const row = attempts.get(where.key);
        const next = row ? { ...row, ...update } : { ...create };
        attempts.set(where.key, next);
        return next;
      },
      deleteMany: async ({ where }: { where: { key: string } }) => ({ count: attempts.delete(where.key) ? 1 : 0 }),
    },
  };
  return { users, attempts, prisma };
});

vi.mock('@/lib/prisma', () => ({ prisma: db.prisma }));

describe('the lock does not tell a real address from an unknown one', () => {
  const PASSWORD = 'Correct-Horse-Battery-26';

  async function signIn(email: string, password: string): Promise<{ status: number; error: unknown }> {
    const { POST } = await import('@/app/api/auth/login/route');
    const response = await POST(
      new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }),
    );
    const body = (await response.json()) as { error?: unknown };
    return { status: response.status, error: body.error };
  }

  beforeEach(async () => {
    db.users.clear();
    db.attempts.clear();
    db.users.set('real@example.com', {
      id: 'u1',
      email: 'real@example.com',
      passwordHash: await hashPassword(PASSWORD),
      disabledAt: null,
    });
  });

  it('answers both the same, try for try, until both are locked', async () => {
    const tries = LOCKOUT_SETTINGS.maxAttempts + 1;
    const real: { status: number; error: unknown }[] = [];
    const unknown: { status: number; error: unknown }[] = [];
    for (let i = 0; i < tries; i += 1) {
      real.push(await signIn('real@example.com', `Wrong-password-${i}`));
      unknown.push(await signIn('nobody@example.com', `Wrong-password-${i}`));
    }
    expect(unknown).toEqual(real);
    expect(real.at(-1)?.status).toBe(429);
  }, 60_000);

  it('says how long the lockout lasts, from the try that locks it onwards', async () => {
    // Round 10 check D15: the locking try said "later" and the screen said "a
    // minute", for a 15-minute lockout; a person trying again took the app for broken.
    const minutes = Math.ceil(LOCKOUT_SETTINGS.lockoutMs / 60_000);
    const answers: { status: number; error: unknown }[] = [];
    for (let i = 0; i < LOCKOUT_SETTINGS.maxAttempts + 1; i += 1) answers.push(await signIn('real@example.com', `Wrong-password-${i}`));
    for (const answer of answers.filter((a) => a.status === 429)) expect(answer.error).toMatch(new RegExp(`in ${minutes} minutes`));
    expect(answers.filter((a) => a.status === 429).length).toBeGreaterThanOrEqual(2);
  }, 60_000);

  it('keeps the right password out while the address is locked', async () => {
    for (let i = 0; i < LOCKOUT_SETTINGS.maxAttempts; i += 1) await signIn('real@example.com', `Wrong-password-${i}`);
    expect((await signIn('real@example.com', PASSWORD)).status).toBe(429);
  }, 60_000);

  it('does not store the address it is counting', async () => {
    await signIn('nobody@example.com', 'Wrong-password-0');
    expect([...db.attempts.keys()].join(' ')).not.toContain('nobody');
  }, 60_000);
});
