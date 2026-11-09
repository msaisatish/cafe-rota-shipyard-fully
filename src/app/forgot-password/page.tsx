'use client';

import { useState, type FormEvent } from 'react';

import { buttonProps } from '@/components/ui_foundation/primitives';

import { RESET_REQUESTED } from '@/components/auth_screens/messages';
import { authCopy } from '@/components/auth_screens/copy';

// Aliased, not relative: these pages install into src/app/<screen>/ and the
// stylesheet into src/components/auth_screens/, so './' points at nothing.
import '@/components/auth_screens/auth-screens.css';

/**
 * Asking for a password reset link.
 *
 * The screen says the same thing whatever happens, because the route behind it
 * does too: an address with an account and an address without one both get
 * "if that address has an account, a link is on its way". The route goes as far
 * as answering identically to a malformed body, so that probing with junk
 * cannot be used to sort real addresses from invented ones.
 *
 * It would be friendlier to say "we could not find that email". It would also
 * turn this form into a free tool for working out who has an account here, and
 * the people most harmed by that are the ones whose membership of a particular
 * service is the sensitive fact.
 */
export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get('email') ?? '').trim();

    setBusy(true);
    try {
      await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      }).catch(() => null);
    } finally {
      setBusy(false);
      // Shown whether the request succeeded, failed, or never left the
      // machine. A network error that produced a different screen would leak
      // the same fact by a slower route.
      setSent(true);
    }
  }

  if (sent) {
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <h1>{authCopy.forgot.heading}</h1>
          <p className="auth-sent" role="status">
            {RESET_REQUESTED}
          </p>
          <p className="auth-alt">
            <a href="/sign-in">{authCopy.forgot.backToSignIn}</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{authCopy.forgot.heading}</h1>
        <p className="auth-lede">{authCopy.forgot.lede}</p>

        <div className="auth-field">
          <label htmlFor="forgot-email">{authCopy.forgot.email}</label>
          <input id="forgot-email" name="email" type="email" autoComplete="username" required />
        </div>

        <button {...buttonProps({ tone: 'primary', busy })} type="submit">
          {busy ? authCopy.forgot.submitting : authCopy.forgot.submit}
        </button>

        <p className="auth-alt">
          <a href="/sign-in">{authCopy.forgot.backToSignIn}</a>
        </p>
      </form>
    </main>
  );
}
