'use client';

import { useState } from 'react';

import { Button } from '@/components/ui_foundation/Button';

/** Ends the session on the server, then shows the sign-in screen. */
export function SignOutButton() {
  const [isBusy, setIsBusy] = useState(false);
  const [problem, setProblem] = useState('');

  async function signOut() {
    setIsBusy(true);
    setProblem('');
    const response = await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    if (response?.ok) {
      window.location.assign('/sign-in');
      return;
    }
    setIsBusy(false);
    setProblem("We couldn't sign you out. Try again.");
  }

  return (
    <span className="rota-signout">
      <Button tone="quiet" busy={isBusy} onClick={signOut}>
        {isBusy ? 'Signing out…' : 'Sign out'}
      </Button>
      {problem ? <span role="alert">{problem}</span> : null}
    </span>
  );
}
