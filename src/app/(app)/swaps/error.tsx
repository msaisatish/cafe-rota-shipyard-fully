'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui_foundation/Button';

import './_components/swaps.css';

/** Broken: a plain sentence and a way to try again. The detail is in the server log. */
export default function SwapRequestsError({ reset }: { reset: () => void }) {
  const router = useRouter();
  function tryAgain() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }
  return (
    <div className="swaps-state">
      <h1>Swap requests</h1>
      <p role="alert">
        We couldn&apos;t load the swap requests. Check your connection and try again.
      </p>
      <Button tone="primary" onClick={tryAgain}>
        Try again
      </Button>
    </div>
  );
}
