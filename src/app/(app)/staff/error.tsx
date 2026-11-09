'use client';

import { startTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui_foundation/Button';

import './_components/staff.css';

/** Broken: a plain sentence and a way to try again. The detail is in the server log. */
export default function StaffError({ reset }: { reset: () => void }) {
  const router = useRouter();
  function tryAgain() {
    startTransition(() => {
      router.refresh();
      reset();
    });
  }
  return (
    <div className="staff-state">
      <h1>Staff</h1>
      <p role="alert">
        We couldn&apos;t load your staff list. Check your connection and try again.
      </p>
      <Button tone="primary" onClick={tryAgain}>
        Try again
      </Button>
    </div>
  );
}
