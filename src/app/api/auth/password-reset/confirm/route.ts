import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { clearFailedSignIns } from '@/components/auth/lockout';
import { checkPassword, hashPassword } from '@/components/auth/password';
import { revokeAllSessions } from '@/components/auth/session';
import { sendEmail } from '@/components/transactional_email/email';
import { appAddress, resetCompletedEmail } from '@/components/password_reset/reset-email';
import { consumeResetToken } from '@/components/password_reset/tokens';

/**
 * `POST /api/auth/password-reset/confirm`
 *
 * Three things have to happen together, and the order matters.
 *
 * 1. The link is spent first, so a token cannot be reused by a second request
 *    arriving while this one is still running.
 * 2. The password is replaced.
 * 3. **Every session is revoked.** This is the step that is easy to leave out
 *    and is the entire point: if somebody else got in, changing the password
 *    while their session keeps working has not removed them. `auth` provides
 *    `revokeAllSessions` for exactly this moment and says so in its own source.
 *
 * The new password is checked against the same rules as sign-up. A reset path
 * with weaker rules than registration is simply the way in.
 */

const Body = z.object({
  token: z.string().min(1),
  password: z.string().min(1),
});

const BAD_LINK = 'That reset link has expired or has already been used. Please request a new one.';

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: BAD_LINK }, { status: 400 });
  }

  const userId = await consumeResetToken(parsed.data.token);
  if (!userId) {
    return NextResponse.json({ error: BAD_LINK }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, disabledAt: true },
  });
  if (!user || user.disabledAt) {
    return NextResponse.json({ error: BAD_LINK }, { status: 400 });
  }

  // The same rules as registration, with the same context, so that "your email
  // address" and "your name" are rejected here too.
  const verdict = checkPassword(parsed.data.password, { email: user.email, name: user.name ?? undefined });
  if (!verdict.ok) {
    // The link is already spent at this point. That is the safe direction to
    // fail: the user requests another one, which costs them an email, whereas
    // leaving it live so they can retry hands a second chance to whoever else
    // may hold it.
    return NextResponse.json({ error: verdict.issues.join(' '), issues: verdict.issues }, { status: 400 });
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Somebody who reset their password should not still be locked out by
      // the failed attempts that made them reset it.
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  // The lock is counted per address since auth 1.2.0; the columns above only
  // matter to projects still on an older auth.
  await clearFailedSignIns(user.email);

  const revoked = await revokeAllSessions(user.id);

  // Never a link built from the Host header in production. Without APP_URL the
  // warning goes unlinked rather than not at all.
  const appUrl = appAddress(process.env.APP_URL, request.nextUrl.origin);
  const message = resetCompletedEmail({ appUrl });
  const outcome = await sendEmail({ to: user.email, subject: message.subject, html: message.html });
  if (!outcome.sent) {
    // Worth a log line: this is the message that would warn a real victim.
    console.error(`[password_reset] change confirmation not sent to user ${user.id}: ${outcome.error}`);
  }

  return NextResponse.json({ ok: true, signedOutSessions: revoked });
}
