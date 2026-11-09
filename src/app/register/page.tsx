'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import { buttonProps } from '@/components/ui_foundation/primitives';

import { noticeFor } from '@/components/auth_screens/messages';
import { authCopy } from '@/components/auth_screens/copy';

// Aliased, not relative: these pages install into src/app/<screen>/ and the
// stylesheet into src/components/auth_screens/, so './' points at nothing.
import '@/components/auth_screens/auth-screens.css';

/**
 * Creating an account.
 *
 * The password rule is stated before they type rather than after they fail.
 * A form that accepts anything and then rejects it is a form that makes people
 * guess what it wants, and they guess by trying shorter things.
 *
 * Note what this screen does *not* do: it does not check whether the address is
 * already registered before submitting. The server answers that, and only the
 * server should, because a check-as-you-type endpoint is an enumeration oracle
 * with a nicer interface.
 */
export default function RegisterPage() {
  const router = useRouter();
  const [problem, setProblem] = useState<string | null>(null);
  const [local, setLocal] = useState<{ email?: string; password?: string }>({});
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '').trim();
    const password = String(data.get('password') ?? '');

    const issues: { email?: string; password?: string } = {};
    if (!email) issues.email = authCopy.local.email;
    if (!password) issues.password = authCopy.local.password;
    else if (password.length < 12) issues.password = authCopy.local.short;
    setLocal(issues);
    if (Object.keys(issues).length > 0) return;

    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).catch(() => null);

      if (!response) {
        setProblem(noticeFor('register', 0).text);
        return;
      }
      if (response.ok) {
        router.refresh();
        router.push('/sign-in');
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setProblem(noticeFor('register', response.status, body).text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-screen">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>{authCopy.register.heading}</h1>

        {problem ? (
          <p className="auth-notice" role="alert">
            {problem}
          </p>
        ) : null}

        <div className="auth-field">
          <label htmlFor="register-email">{authCopy.register.email}</label>
          <input
            id="register-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            {...(local.email ? { 'aria-invalid': true, 'aria-describedby': 'register-email-error' } : {})}
          />
          {local.email ? (
            <p className="auth-error" id="register-email-error">
              {local.email}
            </p>
          ) : null}
        </div>

        <div className="auth-field">
          <label htmlFor="register-password">{authCopy.register.password}</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            aria-describedby={local.password ? 'register-password-error' : 'register-password-hint'}
            {...(local.password ? { 'aria-invalid': true } : {})}
          />
          {/* Said up front. Attached to the field, so it is read out with it. */}
          <p className="auth-hint" id="register-password-hint">
            {authCopy.register.passwordHint}
          </p>
          {local.password ? (
            <p className="auth-error" id="register-password-error">
              {local.password}
            </p>
          ) : null}
        </div>

        <button {...buttonProps({ tone: 'primary', busy })} type="submit">
          {busy ? authCopy.register.submitting : authCopy.register.submit}
        </button>

        <p className="auth-alt">
          {authCopy.register.haveAccount} <a href="/sign-in">{authCopy.register.signInLink}</a>
        </p>
      </form>
    </main>
  );
}
