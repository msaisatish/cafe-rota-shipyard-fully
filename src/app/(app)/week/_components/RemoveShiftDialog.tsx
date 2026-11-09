'use client';

import { useState } from 'react';

import { Dialog } from '@/components/ui_blocks/Dialog';
import { Button } from '@/components/ui_foundation/Button';
import type { ShiftRow } from '@/lib/rota/plan';

const BROKEN = "That shift wasn't removed. Try again.";

/** Null when the shift is gone (including when someone else removed it first). */
async function removeFromRota(shiftId: string): Promise<string | null> {
  const response = await fetch(`/api/shifts/${encodeURIComponent(shiftId)}`, {
    method: 'DELETE',
  }).catch(() => null);
  if (response?.ok || response?.status === 404) return null;
  return BROKEN;
}

/** Asks before taking a shift off the rota. */
export function RemoveShiftDialog({
  shift,
  onClose,
  onRemoved,
}: {
  shift: ShiftRow;
  onClose: () => void;
  onRemoved: (shift: ShiftRow) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm() {
    setIsRemoving(true);
    const failure = await removeFromRota(shift.id);
    setIsRemoving(false);
    if (failure) return setProblem(failure);
    onRemoved(shift);
  }

  const actions = (
    <>
      <Button tone="danger" busy={isRemoving} onClick={confirm}>
        Remove shift
      </Button>
      <Button tone="quiet" onClick={onClose}>
        Keep it
      </Button>
    </>
  );

  const title = `Remove ${shift.name}'s shift on ${shift.weekday} ${shift.start}–${shift.end}?`;
  return (
    <Dialog kind="confirm" title={title} onClose={onClose} actions={actions}>
      {problem ? (
        <p className="week-error" role="alert">
          {problem}
        </p>
      ) : null}
    </Dialog>
  );
}
