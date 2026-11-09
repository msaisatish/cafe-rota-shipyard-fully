'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui_foundation/Button';

import './_components/my-shifts.css';

/** Broken: a plain sentence and a way to try again. The detail is in the server log. */
export default function MyShiftsError({ reset }: { reset: () => void }) {
  const router = useRouter();
  function tryAgain() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }
  return (
    <div className="my-shifts-state">
      <h1>My shifts</h1>
      <p role="alert">
        We couldn&apos;t load your shifts. Try again, or ask your manager if you&apos;re about to
        start.
      </p>
      <Button tone="primary" onClick={tryAgain}>
        Try again
      </Button>
    </div>
  );
}
