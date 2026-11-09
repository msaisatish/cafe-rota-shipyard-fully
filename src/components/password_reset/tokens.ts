import { createHash, randomBytes } from 'node:crypto';

import { prisma } from '@/lib/prisma';

/**
 * Reset links: how they are made, and how they are spent.
 *
 * A reset link is a password that arrives by email, so it is treated like one.
 * Only its hash is stored, it expires, it works once, and issuing a new one
 * kills every older one — otherwise a link from a request the user has
 * forgotten about is still live in an inbox somebody else may reach.
 *
 * The window is deliberately short. An hour is long enough for somebody to go
 * and find the email, and short enough that a link sitting in a mailbox backup
 * stops mattering quickly.
 */

const TOKEN_MINUTES = 60;

/** How many requests one account may generate in the window below. */
const MAX_REQUESTS = 5;
const RATE_WINDOW_MINUTES = 15;

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface IssuedToken {
  /** The value that goes in the link. Never stored, never logged. */
  token: string;
  expiresAt: Date;
}

/** Just enough of a stored token to decide whether it may still be spent. */
export interface SpendableRecord {
  expiresAt: Date;
  usedAt: Date | null;
}

/**
 * May this token still be spent?
 *
 * Pure, and separated from the query on purpose: this is the rule that decides
 * whether an expired or already-used link works, and it should be checkable on
 * every build rather than only on a machine with a database running.
 */
export function isSpendable(record: SpendableRecord, now: Date = new Date()): boolean {
  if (record.usedAt !== null) return false;
  return record.expiresAt.getTime() > now.getTime();
}

/**
 * Has this account asked too often?
 *
 * Rate limiting lives here rather than on the route because the limit protects
 * the *mailbox*, not the endpoint: without it, anyone who knows an address can
 * use this form to bury someone in mail they did not ask for.
 */
export async function tooManyRequests(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_WINDOW_MINUTES * 60 * 1000);
  const recent = await prisma.passwordResetToken.count({
    where: { userId, createdAt: { gt: since } },
  });
  return recent >= MAX_REQUESTS;
}

/**
 * Issue a reset token, invalidating any that are still outstanding.
 *
 * The invalidation is the part worth keeping. "I requested three of these,
 * which link works?" has one answer, and an abandoned request never leaves a
 * working key behind it.
 */
export async function issueResetToken(
  userId: string,
  meta: { ip?: string } = {},
): Promise<IssuedToken> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + TOKEN_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      requestedIp: meta.ip ?? null,
    },
  });

  return { token, expiresAt };
}

/**
 * Spend a reset token.
 *
 * Returns the user it belonged to, or null for anything wrong — expired, spent,
 * or never issued. The caller must not be told which, for the same reason the
 * sign-in form does not say whether an address is known.
 *
 * The update is the claim. Marking `usedAt` with `usedAt: null` in the filter
 * means two requests arriving together cannot both succeed: whichever loses
 * updates zero rows and is refused. Reading first and writing after would let
 * both through.
 */
export async function consumeResetToken(token: string): Promise<string | null> {
  if (!token || typeof token !== 'string') return null;

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });

  if (!record) return null;
  if (!isSpendable(record)) return null;

  const claimed = await prisma.passwordResetToken.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return null;

  return record.userId;
}

/** Throw away every outstanding link for a user, without issuing a new one. */
export async function revokeResetTokens(userId: string): Promise<number> {
  const result = await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });
  return result.count;
}

export { hashToken as resetTokenHash, TOKEN_MINUTES, MAX_REQUESTS, RATE_WINDOW_MINUTES };
