/**
 * What a screen is allowed to say when the server refuses.
 *
 * The sign-in route already takes care not to reveal whether an email address
 * is registered: an unknown address and a wrong password produce the same
 * sentence, and it even verifies against a dummy hash so the two take the same
 * time. That care is worth nothing if the screen in front of it is more
 * helpful, so the mapping is here, in a protected file, rather than inline in
 * the page where somebody will later "improve" it.
 *
 * The rule: **the screen never says more than the server did.** It may
 * translate a status into a sentence. It may not infer.
 */

export type AuthScreen = 'sign-in' | 'register' | 'forgot-password' | 'reset-password';

export interface Notice {
  text: string;
  /** Where it belongs. Never on a field, for anything the server decided. */
  placement: 'form';
  tone: 'danger' | 'warn';
}

/**
 * Turn a response into something to show.
 *
 * `body.error` is used when the server sent one, because the server is the only
 * thing that knows what happened. Where it did not, these sentences are
 * deliberately vague in the same way the server is.
 */
export function noticeFor(screen: AuthScreen, status: number, body?: { error?: string }): Notice {
  if (status === 429) {
    return {
      // The one case where saying more is safe and kind: they know they have
      // been trying, and a wait they cannot see the end of feels like a ban.
      text: body?.error ?? 'Too many attempts. Please wait before you try again.',
      placement: 'form',
      tone: 'warn',
    };
  }

  if (status >= 500) {
    return {
      text: 'Something went wrong at our end. Nothing about your account has changed.',
      placement: 'form',
      tone: 'danger',
    };
  }

  if (screen === 'sign-in') {
    // Always the same sentence, whatever the server's reason. Splitting this
    // into "no such account" and "wrong password" is how a product hands over
    // a list of its customers to anybody with a list of email addresses.
    return {
      text: 'That email address and password do not go together.',
      placement: 'form',
      tone: 'danger',
    };
  }

  return {
    text: body?.error ?? 'Please check the details you entered.',
    placement: 'form',
    tone: 'danger',
  };
}

/**
 * What to say after asking for a password reset link.
 *
 * The same sentence whether or not the address is registered, and it is not an
 * error, so it reads as confirmation. This is the one screen where being vague
 * is obviously right and still gets argued about: "we could not find that
 * email" is friendlier and tells a stranger which addresses have accounts.
 */
export const RESET_REQUESTED =
  'If that address has an account, a link is on its way. It expires in an hour.';
