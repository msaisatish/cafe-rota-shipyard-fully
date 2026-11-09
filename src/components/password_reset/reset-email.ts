/**
 * The reset email.
 *
 * This ships with the component rather than living in the email component's
 * `templates.ts`, which is an extension point the founder may have rewritten.
 * A security email whose wording depends on a file somebody else edits is a
 * security email that can quietly stop saying the important part.
 *
 * The important part is the second paragraph: somebody who did *not* ask for
 * this needs to know that ignoring it is safe, or they will click the link to
 * find out what it does.
 */

/**
 * The address the links in these emails start with, from `APP_URL`.
 *
 * An empty `APP_URL` counts as unset. Unset, it falls back to the address the
 * request came in on during development only: in production that address comes
 * from the Host header, which a visitor or a misconfigured proxy can choose, and
 * a reset link pointing at somebody else's site hands them the token the moment
 * it is clicked. A value that is not an http(s) address is refused too. `null`
 * means "do not build a link". (The same rule as the Stripe part's return
 * address.)
 */
export function appAddress(
  configured: string | undefined,
  requestOrigin: string,
  production = process.env.NODE_ENV === 'production',
): string | null {
  const value = configured?.trim().replace(/\/+$/, '');
  if (!value) return production ? null : requestOrigin.replace(/\/+$/, '');
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? value : null;
  } catch {
    return null;
  }
}

function escape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function layout(body: string): string {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:#14181f;max-width:32rem">${body}</div>`;
}

export function resetRequestEmail(input: { resetUrl: string; minutes: number }) {
  const url = escape(input.resetUrl);
  return {
    subject: 'Reset your password',
    html: layout(
      `<p>Somebody asked to reset the password for this account.</p>
       <p><a href="${url}">Choose a new password</a></p>
       <p>This link works once and stops working in ${input.minutes} minutes.</p>
       <p>If this was not you, you can ignore this email — your password has not
       changed and nobody can get in without this link.</p>`,
    ),
  };
}

/**
 * Sent after the change, to the address that was changed.
 *
 * This is the one that catches a real account takeover: the attacker has the
 * mailbox or they do not, and if they do not, this is the message that tells
 * the owner something happened while they still have time to act.
 */
export function resetCompletedEmail(input: { appUrl: string | null }) {
  // With no trustworthy address to link to, the warning still goes, unlinked.
  const signIn = input.appUrl ? `<a href="${escape(input.appUrl)}">sign in</a>` : 'sign in';
  return {
    subject: 'Your password was changed',
    html: layout(
      `<p>Your password has just been changed, and you have been signed out on
       every device.</p>
       <p>If that was you, there is nothing to do — ${signIn}
       with your new password.</p>
       <p>If it was not you, reset your password immediately and check who has
       access to this mailbox.</p>`,
    ),
  };
}
