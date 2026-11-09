'use client';

import { Suspense, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { buttonProps } from '@/components/ui_foundation/primitives';

import { noticeFor } from '@/components/auth_screens/messages';
import { authCopy } from '@/components/auth_screens/copy';

// Aliased, not relative: these pages install into src/app/<screen>/ and the
// stylesheet into src/components/auth_screens/, so './' points at nothing.
import '@/components/auth_screens/auth-screens.css';

/**
 * The other half of a password reset: the page the emailed link lands on.
 *
 * `/forgot-password` sends the mail and the route that changes the password is
 * installed by `password_reset`, so without this page the flow ended at a 404
 * with a live token in the URL.
 *
 * Three things here are not obvious:
 *
 * The token is spent by the *first* request that reaches the route, including
 * one that then fails the password rules. So a mistyped new password costs the
 * whole link, which is why this screen asks twice and checks the two match
 * before it posts anything. The confirm field is not ceremony; it is the only
 * protection against locking yourself out with a typo you cannot see.
 *
 * A link with no token is not posted at all. Sending `token: ''` would spend a
 * request and come back with the same "expired or already used" sentence, which
 * reads as "the link I was sent is broken" when the truth is "the link was
 * truncated by your mail client".
 *
 * Changing the password signs out every session, including any the attacker
 * had. That is the point of the reset, so the screen says it happened rather
 * than leaving somebody wondering why their phone logged out.
 */

interface ResetCopy {
  heading: string;
  lede: string;
  password: string;
  confirm: string;
  submit: string;
  submitting: string;
  backToSignIn: string;
  passwordHint: string;
  noToken: string;
  requestAnother: string;
  done: string;
  signInLink: string;
  mismatch: string;
}

/**
 * Defaults merged under whatever `copy.ts` provides.
 *
 * `copy.ts` is the founder's file and an upgrade never overwrites it, so a
 * project that installed an earlier `auth_screens` has a `copy.ts` with no
 * `reset` section in it. Reading `authCopy.reset.heading` directly would turn
 * that upgrade into a failed build. Merging means an old file still works and a
 * new one still overrides.
 */
const DEFAULTS: ResetCopy = {
  heading: 'Choose a new password',
  lede: 'This link works once. Pick something you will remember.',
  password: 'New password',
  confirm: 'Type it again',
  submit: 'Save the new password',
  submitting: 'Saving',
  backToSignIn: 'Back to sign in',
  passwordHint: 'At least 12 characters. A short sentence you will remember beats a short password you will not.',
  noToken: 'This link is not complete. Mail programs sometimes cut long links in half, so it is worth asking for a new one.',
  requestAnother: 'Send me a new link',
  done: 'Your password is changed, and everything that was signed in has been signed out. Sign in with the new one.',
  signInLink: 'Sign in',
  mismatch: 'Those two do not match.',
};

function resetCopy(): ResetCopy {
  const theirs = (authCopy as { reset?: Partial<ResetCopy> }).reset;
  return { ...DEFAULTS, ...theirs };
}

function ResetPassword() {
  const router = useRouter();
  const params = useSearchParams();
  const copy = resetCopy();

  const token = params.get('token') ?? '';
  const [problem, setProblem] = useState<string | null>(null);
  const [local, setLocal] = useState<{ password?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get('password') ?? '');
    const confirm = String(data.get('confirm') ?? '');

    // Checked before anything is sent, because the request spends the link.
    const issues: { password?: string; confirm?: string } = {};
    if (!password) issues.password = authCopy.local.password;
    else if (password.length < 12) issues.password = authCopy.local.short;
    else if (confirm !== password) issues.confirm = copy.mismatch;
    setLocal(issues);
    if (Object.keys(issues).length > 0) return;

    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password }),
      }).catch(() => null);

      if (!response) {
        setProblem(noticeFor('reset-password', 0).text);
        return;
      }
      if (response.ok) {
        setDone(true);
        // Every session was just revoked, this one included, so there is
        // nowhere to go but sign-in.
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setProblem(noticeFor('reset-password', response.status, body).text);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <h1>{copy.heading}</h1>
          <p className="auth-sent" role="status">
            {copy.done}
          </p>
          <p className="auth-alt">
            <a href="/sign-in">{copy.signInLink}</a>
          </p>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="auth-screen">
        <div className="auth-card">
          <h1>{copy.heading}</h1>
          <p className="auth-notice" role="alert">
            {copy.noToken}
          </p>
          <p className="auth-alt">
            <a href="/forgot-password">{copy.requestAnother}</a>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{copy.heading}</h1>
        <p className="auth-lede">{copy.lede}</p>

        {problem ? (
          <p className="auth-notice" role="alert">
            {problem}
          </p>
        ) : null}

        <div className="auth-field">
          <label htmlFor="reset-password">{copy.password}</label>
          <input
            id="reset-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-describedby={local.password ? 'reset-password-error' : 'reset-password-hint'}
            {...(local.password ? { 'aria-invalid': true } : {})}
          />
          <p className="auth-hint" id="reset-password-hint">
            {copy.passwordHint}
          </p>
          {local.password ? (
            <p className="auth-error" id="reset-password-error">
              {local.password}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="reset-confirm">{copy.confirm}</label>
          <input
            id="reset-confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            {...(local.confirm ? { 'aria-invalid': true, 'aria-describedby': 'reset-confirm-error' } : {})}
          />
          {local.confirm ? (
            <p className="auth-error" id="reset-confirm-error">
              {local.confirm}
            </p>
          ) : null}
        </div>

        <button {...buttonProps({ tone: 'primary', busy })} type="submit">
          {busy ? copy.submitting : copy.submit}
        </button>

        <p className="auth-alt">
          <a href="/sign-in">{copy.backToSignIn}</a>
        </p>
      </form>
    </main>
  );
}

/**
 * `useSearchParams` suspends, and Next refuses to build a page that reads it
 * without a boundary. The fallback is the card's own outline rather than a
 * spinner, so the screen does not jump when it resolves.
 */
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="auth-screen"><div className="auth-card" /></main>}>
      <ResetPassword />
    </Suspense>
  );
}
