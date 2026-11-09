'use client';

import { useState } from 'react';

import { Dialog } from '@/components/ui_blocks/Dialog';
import { Button } from '@/components/ui_foundation/Button';

const BROKEN = "The week wasn't published. Try again.";

async function publish(weekStart: string): Promise<string | null> {
  const response = await fetch('/api/week/publish', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ weekStart }),
  }).catch(() => null);
  if (response?.ok) return null;
  if (response?.status !== 400) return BROKEN;
  const reply = (await response.json().catch(() => null)) as { error?: string } | null;
  return reply?.error ?? BROKEN;
}

/** Asks before letting staff see the week. */
export function PublishWeekDialog({
  weekStart,
  dayMonth,
  onClose,
  onPublished,
}: {
  weekStart: string;
  dayMonth: string;
  onClose: () => void;
  onPublished: () => void;
}) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function confirm() {
    setIsPublishing(true);
    const failure = await publish(weekStart);
    setIsPublishing(false);
    if (failure) return setProblem(failure);
    onPublished();
  }

  const actions = (
    <>
      <Button tone="primary" busy={isPublishing} onClick={confirm}>
        Publish week
      </Button>
      <Button tone="quiet" onClick={onClose}>
        Not yet
      </Button>
    </>
  );

  return (
    <Dialog
      kind="confirm"
      title={`Publish the week of ${dayMonth}?`}
      onClose={onClose}
      actions={actions}
    >
      <p>Everyone on it will see their shifts straight away.</p>
      {problem ? (
        <p className="week-error" role="alert">
          {problem}
        </p>
      ) : null}
    </Dialog>
  );
}
