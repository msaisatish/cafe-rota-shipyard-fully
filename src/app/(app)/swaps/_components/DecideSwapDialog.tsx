'use client';

import { useState } from 'react';

import { Dialog } from '@/components/ui_blocks/Dialog';
import { Button } from '@/components/ui_foundation/Button';
import type { SwapStatus } from '@/lib/swaps/schema';
import type { DecisionAsked } from './SwapTable';

const BROKEN = "That didn't go through, so nothing changed on the rota. Try again.";

type Sent = { ok: true; status: SwapStatus } | { ok: false; message: string };

async function sendDecision({ swap, decision }: DecisionAsked): Promise<Sent> {
  const response = await fetch(`/api/swaps/${encodeURIComponent(swap.id)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ decision }),
  }).catch(() => null);
  const reply = (await response?.json().catch(() => null)) as {
    status?: SwapStatus;
    error?: string;
  } | null;
  if (response?.ok && reply?.status) return { ok: true, status: reply.status };
  // A 409 says why (already decided, or the shift changed); anything else is a plain failure.
  if (response?.status === 409 && reply?.error) return { ok: false, message: reply.error };
  return { ok: false, message: BROKEN };
}

function wordsFor({ swap, decision }: DecisionAsked) {
  if (decision === 'approve') {
    return {
      title: `Approve? ${swap.to} will work ${swap.shiftInFull} instead of ${swap.from}.`,
      confirm: 'Approve swap',
    };
  }
  return {
    title: `Turn down ${swap.from}'s request? ${swap.from} keeps the shift.`,
    confirm: 'Turn down',
  };
}

/** Asks before approving or turning down, naming who works which shift. */
export function DecideSwapDialog({
  asked,
  onClose,
  onDecided,
}: {
  asked: DecisionAsked;
  onClose: () => void;
  onDecided: (status: SwapStatus) => void;
}) {
  const [isSending, setIsSending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const words = wordsFor(asked);

  async function confirm() {
    setIsSending(true);
    const sent = await sendDecision(asked);
    setIsSending(false);
    if (!sent.ok) return setProblem(sent.message);
    onDecided(sent.status);
  }

  const actions = (
    <>
      <Button
        tone={asked.decision === 'approve' ? 'primary' : 'quiet'}
        busy={isSending}
        onClick={confirm}
      >
        {words.confirm}
      </Button>
      <Button tone="quiet" onClick={onClose}>
        Cancel
      </Button>
    </>
  );

  return (
    <Dialog kind="confirm" title={words.title} onClose={onClose} actions={actions}>
      {problem ? (
        <p className="swaps-error" role="alert">
          {problem}
        </p>
      ) : null}
    </Dialog>
  );
}
