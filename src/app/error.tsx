'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui_foundation/Button';

import '@/components/auth_screens/auth-screens.css';

/**
 * Broken, for anything the screens' own error pages cannot catch (the frame
 * around them, the gate screens). A plain sentence and a way out; the detail is
 * in the server log.
 */
export default function AppError({ reset }: { reset: () => void }) {
  const router = useRouter();

  function tryAgain() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }

  return (
    <main className="auth-screen">
      <div className="auth-card">
        <h1>Café rota didn&apos;t open</h1>
        <p className="auth-lede" role="alert">
          Something went wrong at our end. Check your connection and try again.
        </p>
        <Button tone="primary" onClick={tryAgain}>
          Try again
        </Button>
        <p className="auth-alt">
          <a href="/sign-in">Go to sign in</a>
        </p>
      </div>
    </main>
  );
}
