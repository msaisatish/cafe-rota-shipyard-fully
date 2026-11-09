'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui_foundation/Button';
import { Status } from '@/components/ui_foundation/Status';
import type { MyShift } from '@/lib/rota/my-shifts';
import type { StaffChoice } from '@/lib/rota/plan';
import { AskSwapDialog } from './AskSwapDialog';

/** Ask to swap on a shift card, or the waiting status once a request is in. */
export function SwapAction({
  shift,
  colleagues,
  isWaiting,
}: {
  shift: MyShift;
  colleagues: readonly StaffChoice[];
  isWaiting: boolean;
}) {
  const router = useRouter();
  const [isAsking, setIsAsking] = useState(false);
  const [wasSent, setWasSent] = useState(false);

  if (isWaiting || wasSent) {
    return <Status tone="warn" label="Swap asked – waiting for the manager" announce={wasSent} />;
  }

  function sent() {
    setIsAsking(false);
    setWasSent(true);
    router.refresh();
  }

  return (
    <>
      <Button
        tone="quiet"
        label={`Ask to swap your ${shift.day} shift`}
        onClick={() => setIsAsking(true)}
      >
        Ask to swap
      </Button>
      {isAsking ? (
        <AskSwapDialog
          shift={shift}
          colleagues={colleagues}
          onClose={() => setIsAsking(false)}
          onSent={sent}
        />
      ) : null}
    </>
  );
}
