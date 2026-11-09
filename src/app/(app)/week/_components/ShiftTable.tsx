'use client';

import { DataTable } from '@/components/data_table/DataTable';
import { Button } from '@/components/ui_foundation/Button';
import type { ShiftRow } from '@/lib/rota/plan';

const COLUMNS = [
  { key: 'day', label: 'Day', sortable: false },
  { key: 'start', label: 'Start', sortable: false },
  { key: 'end', label: 'End', sortable: false },
  { key: 'who', label: 'Who', sortable: false },
  { key: 'action', label: 'Remove', sortable: false },
] as const;

/**
 * The week's shifts. The rows arrive sorted by day then start time, which is
 * the only order that makes sense for a rota, so the columns do not re-sort.
 */
export function ShiftTable({
  caption,
  shifts,
  onRemove,
}: {
  caption: string;
  shifts: readonly ShiftRow[];
  onRemove: (shift: ShiftRow) => void;
}) {
  const cells = shifts.map((shift) => ({
    day: shift.day,
    start: shift.start,
    end: shift.end,
    who: (
      <span className="week-truncate" title={shift.who}>
        {shift.who}
      </span>
    ),
    action: (
      <Button
        tone="quiet"
        label={`Remove ${shift.name}'s ${shift.weekday} shift`}
        onClick={() => onRemove(shift)}
      >
        Remove
      </Button>
    ),
  }));
  return (
    <div className="week-table">
      <DataTable
        caption={caption}
        rows={cells}
        columns={COLUMNS}
        searchable={false}
        pageSize={100}
      />
    </div>
  );
}
