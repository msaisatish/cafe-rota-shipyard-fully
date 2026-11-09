'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { SignInForm } from '@/components/ui_blocks/SignInForm';
import type { FieldName, SignInFailure, SignInRefusal } from '@/components/ui_blocks/blocks';

import { safeNext } from '@/components/auth_screens/redirect';
import { authCopy } from '@/components/auth_screens/copy';

// Aliased, not relative: these pages install into src/app/<screen>/ and the
// stylesheet into src/components/auth_screens/, so './' points at nothing.
import '@/components/auth_screens/auth-screens.css';

/**
 * The sign-in screen.
 *
 * Almost none of this is new. The form, the rule that a refusal never says
 * which half was wrong, the busy button that stays focusable: all of that comes
 * from `ui_blocks`. What this component adds is the two things that are about
 * *this* app rather than about forms in general - talking to the sign-in API,
 * and deciding where somebody lands afterwards.
 *
 * The second is the dangerous one. See `redirect.ts`.
 */

function SignIn() {
  const router = useRouter();
  const params = useSearchParams();
  const [done, setDone] = useState(false);

  async function submit(values: Record<FieldName, string>): Promise<SignInFailure | SignInRefusal | null> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(values),
    }).catch(() => null);

    if (!response) return 'server';

    if (response.ok) {
      setDone(true);
      // `refresh()` first so anything rendered on the server sees the new
      // session. Without it the destination can render as though nobody is
      // signed in, and the founder reports that signing in "did not work".
      router.refresh();
      router.push(safeNext(params.get('next')));
      return null;
    }

    // The server knows how long the lockout lasts; the form's own sentence
    // does not (refusalText in ui_blocks shows it for a wait, never for a
    // wrong password).
    if (response.status === 429) {
      const body = (await response.json().catch(() => null)) as { error?: unknown } | null;
      return { failure: 'rate-limited', message: typeof body?.error === 'string' ? body.error : undefined };
    }
    if (response.status >= 500) return 'server';

    // The server will not say whether the address is registered, and this
    // screen must not appear to know either. `ui_blocks` maps both credential
    // failures onto one sentence, so either value produces the same words.
    return 'wrong-password';
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <SignInForm onSubmit={submit} forgotHref="/forgot-password" />
        <p className="auth-alt">
          {authCopy.signIn.noAccount} <a href="/register">{authCopy.signIn.registerLink}</a>
        </p>
        {done ? <p className="auth-going">{authCopy.signIn.goingThere}</p> : null}
      </div>
    </main>
  );
}

/**
 * `useSearchParams` suspends, and Next refuses to build a page that reads it
 * without a boundary. The fallback is the card's own outline rather than a
 * spinner, so the screen does not jump when it resolves.
 */
export default function SignInPage() {
  return (
    <Suspense fallback={<main className="auth-screen"><div className="auth-card" /></main>}>
      <SignIn />
    </Suspense>
  );
}
