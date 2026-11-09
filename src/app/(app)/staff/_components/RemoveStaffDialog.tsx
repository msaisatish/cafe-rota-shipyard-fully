'use client';

import { useState } from 'react';

import { Dialog } from '@/components/ui_blocks/Dialog';
import { Button } from '@/components/ui_foundation/Button';
import type { StaffRow } from '@/lib/staff/rows';

const BROKEN = "That person wasn't removed. Try again.";

async function removeFromStaff(memberId: string): Promise<string | null> {
  const response = await fetch(`/api/staff/${encodeURIComponent(memberId)}`, {
    method: 'DELETE',
  }).catch(() => null);
  if (response?.ok) return null;
  if (response?.status !== 400) return BROKEN;
  const reply = (await response.json().catch(() => null)) as { error?: string } | null;
  return reply?.error ?? BROKEN;
}

/** Asks before taking someone off the staff list. */
export function RemoveStaffDialog({
  person,
  onClose,
  onRemoved,
}: {
  person: StaffRow;
  onClose: () => void;
  onRemoved: (person: StaffRow) => void;
}) {
  const [isRemoving, setIsRemoving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm() {
    setIsRemoving(true);
    const failure = await removeFromStaff(person.id);
    setIsRemoving(false);
    if (failure) return setProblem(failure);
    onRemoved(person);
  }

  const actions = (
    <>
      <Button tone="danger" busy={isRemoving} onClick={confirm}>
        {`Remove ${person.name}`}
      </Button>
      <Button tone="quiet" onClick={onClose}>
        Keep them
      </Button>
    </>
  );

  return (
    <Dialog kind="confirm" title={`Remove ${person.name}?`} onClose={onClose} actions={actions}>
      <p>They won&apos;t be able to sign in. Their past shifts stay on the rota.</p>
      {problem ? (
        <p className="staff-error" role="alert">
          {problem}
        </p>
      ) : null}
    </Dialog>
  );
}
