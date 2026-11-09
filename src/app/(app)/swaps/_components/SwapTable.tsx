'use client';

import { DataTable } from '@/components/data_table/DataTable';
import { Button } from '@/components/ui_foundation/Button';
import type { SwapDecision } from '@/lib/swaps/schema';
import type { SwapRow } from '@/lib/swaps/view';
import { ManagerSwapStatus } from './SwapStatus';

const COLUMNS = [
  { key: 'shift', label: 'Shift', sortable: false },
  { key: 'from', label: 'From', sortable: false },
  { key: 'to', label: 'To', sortable: false },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'action', label: 'Decide', sortable: false },
] as const;

export interface DecisionAsked {
  swap: SwapRow;
  decision: SwapDecision;
}

function DecideButtons({
  swap,
  onDecide,
}: {
  swap: SwapRow;
  onDecide: (asked: DecisionAsked) => void;
}) {
  if (swap.status !== 'waiting') return null;
  return (
    <span className="swaps-actions">
      <Button
        tone="primary"
        label={`Approve ${swap.from}'s swap to ${swap.to}`}
        onClick={() => onDecide({ swap, decision: 'approve' })}
      >
        Approve
      </Button>
      <Button
        tone="quiet"
        label={`Turn down ${swap.from}'s swap to ${swap.to}`}
        onClick={() => onDecide({ swap, decision: 'turn_down' })}
      >
        Turn down
      </Button>
    </span>
  );
}

/** The requests, waiting first, in the order the server sends them; the columns do not re-sort. */
export function SwapTable({
  swaps,
  onDecide,
}: {
  swaps: readonly SwapRow[];
  onDecide: (asked: DecisionAsked) => void;
}) {
  const cells = swaps.map((swap) => ({
    shift: swap.shift,
    from: swap.from,
    to: swap.to,
    status: <ManagerSwapStatus status={swap.status} />,
    action: <DecideButtons swap={swap} onDecide={onDecide} />,
  }));
  return (
    <div className="swaps-table">
      <DataTable
        caption="Swap requests from your staff"
        rows={cells}
        columns={COLUMNS}
        searchable={false}
        pageSize={100}
      />
    </div>
  );
}
