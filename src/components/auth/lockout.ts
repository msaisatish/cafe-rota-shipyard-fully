import { createHash } from 'node:crypto';

import { prisma } from '@/lib/prisma';
import { normaliseEmail } from '@/components/auth/password';

/**
 * Slowing down someone guessing passwords.
 *
 * The count lives in the database rather than in memory, for two reasons that
 * both matter: restarting the app must not hand an attacker a fresh set of
 * attempts, and an app running as more than one process must not give them one
 * set of attempts per process.
 *
 * It is kept per email address, whether or not an account has that address.
 * Counting only real accounts meant a real address said "too many attempts"
 * after a few wrong passwords while an unknown one never did, which told anyone
 * willing to guess five times exactly who had an account (founder test,
 * 2026-10-27). The address itself is not stored, only its SHA-256, so a guess
 * at somebody else's address does not leave that address in this table.
 *
 * It does not stop someone trying one password against ten thousand accounts:
 * that needs a per-address limit, which belongs at the edge rather than here.
 */

const MAX_ATTEMPTS = Math.max(Number.parseInt(process.env.AUTH_LOCKOUT_MAX_ATTEMPTS ?? '5', 10) || 5, 1);
const LOCKOUT_MS = Math.max(
  Number.parseInt(process.env.AUTH_LOCKOUT_DURATION_MS ?? '900000', 10) || 900_000,
  60_000,
);

export function isLockedOut(state: { lockedUntil: Date | null }): boolean {
  return Boolean(state.lockedUntil && state.lockedUntil.getTime() > Date.now());
}

/** Minutes remaining, rounded up, for a message a person can act on. */
export function lockoutMinutesRemaining(state: { lockedUntil: Date | null }): number {
  if (!state.lockedUntil) return 0;
  const remaining = state.lockedUntil.getTime() - Date.now();
  return remaining <= 0 ? 0 : Math.ceil(remaining / 60_000);
}

/** The key failed sign-ins are counted under: the same for every spelling of one address. */
export function attemptKey(email: string): string {
  return createHash('sha256').update(normaliseEmail(email)).digest('hex');
}

/** What one more failure does to the count. Pure, so the contract can check it without a database. */
export function afterFailure(failures: number, now = Date.now()): { failures: number; lockedUntil: Date | null } {
  const next = failures + 1;
  return { failures: next, lockedUntil: next >= MAX_ATTEMPTS ? new Date(now + LOCKOUT_MS) : null };
}

/** The lock on this address, if there is one. */
export async function signInLock(email: string): Promise<{ lockedUntil: Date | null }> {
  const row = await prisma.loginAttempt.findUnique({ where: { key: attemptKey(email) }, select: { lockedUntil: true } });
  return { lockedUntil: row?.lockedUntil ?? null };
}

/** Count a failed sign-in for this address, known or not. */
export async function recordFailedSignIn(email: string): Promise<{ locked: boolean }> {
  const key = attemptKey(email);
  const row = await prisma.loginAttempt.findUnique({ where: { key }, select: { failures: true, lockedUntil: true } });
  // A lock that has run out starts the count again rather than re-locking on the next slip.
  const previous = row && row.lockedUntil && row.lockedUntil.getTime() <= Date.now() ? 0 : (row?.failures ?? 0);
  const next = afterFailure(previous);
  await prisma.loginAttempt.upsert({
    where: { key },
    create: { key, failures: next.failures, lockedUntil: next.lockedUntil },
    update: { failures: next.failures, lockedUntil: next.lockedUntil },
  });
  return { locked: next.lockedUntil !== null };
}

/** A successful sign-in, or a password reset, clears the count for the address. */
export async function clearFailedSignIns(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key: attemptKey(email) } });
}

export const LOCKOUT_SETTINGS = { maxAttempts: MAX_ATTEMPTS, lockoutMs: LOCKOUT_MS };
