import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import {
  clearFailedSignIns,
  isLockedOut,
  LOCKOUT_SETTINGS,
  lockoutMinutesRemaining,
  recordFailedSignIn,
  signInLock,
} from '@/components/auth/lockout';
import { normaliseEmail, verifyPassword } from '@/components/auth/password';
import { createSession } from '@/components/auth/session';

/**
 * `POST /api/auth/login`
 *
 * The important detail here is what this route refuses to tell you. Every
 * failure returns the same sentence, whether the email is unknown, the password
 * is wrong, or the account is disabled. Distinguishing them turns the sign-in
 * form into a way of finding out who has an account, which for most products is
 * information worth having and for some — a therapy service, a jobs board — is
 * information worth protecting.
 *
 * The lock is the same: it is counted per email address and checked before the
 * account is looked up, so an address nobody has locks after the same number
 * of tries, with the same words, as one somebody does.
 */

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const REJECTION = 'That email and password do not match.';

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: REJECTION }, { status: 401 });
  }

  const email = normaliseEmail(parsed.data.email);

  const lock = await signInLock(email);
  if (isLockedOut(lock)) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${lockoutMinutesRemaining(lock)} minutes.` },
      { status: 429 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, disabledAt: true },
  });

  // An unknown address spends roughly the same time as a real comparison would.
  // Answering instantly for unknown addresses is a way of enumerating them.
  const correct = await verifyPassword(
    parsed.data.password,
    user?.passwordHash ?? '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv',
  );

  if (!user || !correct || user.disabledAt) {
    const { locked } = await recordFailedSignIn(email);
    return NextResponse.json(
      // The try that locks says how long for, as every refused try after it does:
      // "later" read as a minute, and the screen said so (round 10, check D15).
      { error: locked ? `Too many attempts. Try again in ${Math.ceil(LOCKOUT_SETTINGS.lockoutMs / 60_000)} minutes.` : REJECTION },
      { status: locked ? 429 : 401 },
    );
  }

  await clearFailedSignIns(email);
  await createSession(user.id, {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim(),
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
