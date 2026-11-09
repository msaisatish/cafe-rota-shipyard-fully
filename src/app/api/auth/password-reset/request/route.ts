import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { normaliseEmail } from '@/components/auth/password';
import { sendEmail } from '@/components/transactional_email/email';
import { appAddress, resetRequestEmail } from '@/components/password_reset/reset-email';
import { issueResetToken, tooManyRequests, TOKEN_MINUTES } from '@/components/password_reset/tokens';

/**
 * `POST /api/auth/password-reset/request`
 *
 * Always the same answer.
 *
 * Unknown address, known address, disabled account, rate-limited — every one of
 * these returns the same sentence with the same status. This form is otherwise
 * the easiest account-enumeration oracle a product has: it takes an email
 * address and tells you, for free and without signing in, whether it is
 * registered. For a jobs board or a therapy service that is not a small leak.
 *
 * So what varies is what happens, never what is said.
 */

const Body = z.object({
  email: z.string().email(),
});

/** Said whatever happened. Deliberately not "if that address is registered…", */
/** which still hints at the mechanism — just state what the user should do. */
const ALWAYS = 'Check your email. If we have an account for that address, a reset link is on its way.';

export async function POST(request: NextRequest) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  // Even a malformed body gets the same answer, so that probing with junk
  // cannot be used to tell valid addresses from invalid ones.
  if (!parsed.success) {
    return NextResponse.json({ ok: true, message: ALWAYS });
  }

  // The link is built from APP_URL. In production, without it there is no
  // address to trust (the request's own Host header can be forged), so no link
  // is sent to anyone, and the answer is still the same.
  const appUrl = appAddress(process.env.APP_URL, request.nextUrl.origin);
  if (!appUrl) {
    console.error('[password_reset] APP_URL is not set to the web address of your app, so no reset link was sent.');
    return NextResponse.json({ ok: true, message: ALWAYS });
  }

  const email = normaliseEmail(parsed.data.email);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, disabledAt: true },
  });

  // A disabled account does not get a link. Resetting the password of a
  // suspended account is a way back in, and nothing here should offer one.
  if (user && !user.disabledAt && !(await tooManyRequests(user.id))) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const { token } = await issueResetToken(user.id, { ip });

    const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const message = resetRequestEmail({ resetUrl, minutes: TOKEN_MINUTES });
    const outcome = await sendEmail({ to: email, subject: message.subject, html: message.html });

    // A send failure is logged and swallowed. Reporting it would say the
    // address exists, and the user's next move is the same either way.
    if (!outcome.sent) {
      console.error(`[password_reset] could not send to user ${user.id}: ${outcome.error}`);
    }
  }

  return NextResponse.json({ ok: true, message: ALWAYS });
}
