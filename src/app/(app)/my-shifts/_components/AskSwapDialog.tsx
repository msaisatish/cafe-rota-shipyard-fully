'use client';

import { useState, type FormEvent } from 'react';

import { Dialog } from '@/components/ui_blocks/Dialog';
import { Button } from '@/components/ui_foundation/Button';
import { buttonProps } from '@/components/ui_foundation/primitives';
import { validate } from '@/seams/validate';
import type { StaffChoice } from '@/lib/rota/plan';
import type { MyShift } from '@/lib/rota/my-shifts';
import { askSwapSchema } from '@/lib/swaps/schema';
import { ColleagueField } from './ColleagueField';

const FORM_ID = 'ask-swap-form';
const BROKEN = "That swap request wasn't sent. Try again.";

/** Null when the request was sent, otherwise what to show. */
async function sendSwapRequest(shiftId: string, form: HTMLFormElement): Promise<string | null> {
  const checked = validate(askSwapSchema, {
    shiftId,
    toMemberId: new FormData(form).get('toMemberId'),
  });
  if (!checked.ok) return checked.fieldErrors.toMemberId ?? checked.message;
  const response = await fetch('/api/swaps', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(checked.data),
  }).catch(() => null);
  if (response?.ok) return null;
  const reply = (await response?.json().catch(() => null)) as { error?: string } | null;
  const isExplained = response?.status === 400 || response?.status === 409;
  return isExplained && reply?.error ? reply.error : BROKEN;
}

/** "Who would take your Tuesday 12 Nov, 08:00–14:00 shift?" (DESIGN.md section 4). */
export function AskSwapDialog({
  shift,
  colleagues,
  onClose,
  onSent,
}: {
  shift: MyShift;
  colleagues: readonly StaffChoice[];
  onClose: () => void;
  onSent: () => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const canAsk = colleagues.length > 0;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSending(true);
    const failure = await sendSwapRequest(shift.id, event.currentTarget);
    setIsSending(false);
    if (failure) return setProblem(failure);
    onSent();
  }

  const send = buttonProps({ tone: 'primary', busy: isSending, disabled: !canAsk });
  const actions = (
    <>
      <button {...send} type="submit" form={FORM_ID}>
        {isSending ? 'Sending…' : 'Send swap request'}
      </button>
      <Button tone="quiet" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  const title = `Who would take your ${shift.day}, ${shift.start}–${shift.end} shift?`;
  return (
    <Dialog kind="form" title={title} onClose={onClose} actions={actions}>
      <form id={FORM_ID} className="my-shifts-form" onSubmit={submit} noValidate>
        {problem ? (
          <p className="my-shifts-error" role="alert">
            {problem}
          </p>
        ) : null}
        {canAsk ? (
          <ColleagueField colleagues={colleagues} hasProblem={problem !== null} />
        ) : (
          <p>There is no one else on the staff list to swap with yet.</p>
        )}
        <p>Your manager decides. Until then, this shift is still yours.</p>
      </form>
    </Dialog>
  );
}
