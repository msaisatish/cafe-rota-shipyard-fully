'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui_foundation/Button';

import './_components/week.css';

/** Broken: a plain sentence and a way to try again. The detail is in the server log. */
export default function WeekError({ reset }: { reset: () => void }) {
  const router = useRouter();
  function tryAgain() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }
  return (
    <div className="week-state">
      <h1>Plan the week</h1>
      <p role="alert">We couldn&apos;t load this week. Check your connection and try again.</p>
      <Button tone="primary" onClick={tryAgain}>
        Try again
      </Button>
    </div>
  );
}
