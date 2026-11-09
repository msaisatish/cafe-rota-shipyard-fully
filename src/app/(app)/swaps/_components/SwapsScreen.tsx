'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Toasts, useToasts } from '@/components/ui_blocks/Toasts';
import type { SwapStatus } from '@/lib/swaps/schema';
import type { SwapRow } from '@/lib/swaps/view';
import { DecideSwapDialog } from './DecideSwapDialog';
import { SwapTable, type DecisionAsked } from './SwapTable';

import './swaps.css';

function toastFor(swap: SwapRow, status: SwapStatus): string {
  if (status === 'approved') return `Approved. ${swap.to} works ${swap.shiftInFull} now.`;
  return `Turned down. ${swap.from} keeps the shift.`;
}

/** The Swap requests screen: waiting first, approve or turn down (DESIGN.md section 5). */
export function SwapsScreen({ swaps }: { swaps: readonly SwapRow[] }) {
  const router = useRouter();
  const toasts = useToasts();
  const [asked, setAsked] = useState<DecisionAsked | null>(null);
  // The row changes in place at once; the refresh then brings the nav count up to date.
  const [decided, setDecided] = useState<Record<string, SwapStatus>>({});
  const rows = swaps.map((swap) => ({ ...swap, status: decided[swap.id] ?? swap.status }));

  function finished(swap: SwapRow, status: SwapStatus) {
    setAsked(null);
    setDecided((before) => ({ ...before, [swap.id]: status }));
    toasts.show({ id: `swap-${Date.now()}`, tone: 'ok', text: toastFor(swap, status) });
    router.refresh();
  }

  return (
    <div className="swaps">
      <h1>Swap requests</h1>
      {rows.length === 0 ? (
        <p className="swaps-empty">
          No swap requests. When someone asks to swap a shift, it shows up here for you to approve
          or turn down.
        </p>
      ) : (
        <SwapTable swaps={rows} onDecide={setAsked} />
      )}
      {asked ? (
        <DecideSwapDialog
          asked={asked}
          onClose={() => setAsked(null)}
          onDecided={(status) => finished(asked.swap, status)}
        />
      ) : null}
      <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}
