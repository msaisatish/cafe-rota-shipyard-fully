'use client';

import { DataTable } from '@/components/data_table/DataTable';
import { Button } from '@/components/ui_foundation/Button';
import { Status } from '@/components/ui_foundation/Status';
import type { StaffRow } from '@/lib/staff/rows';

function Truncated({ text }: { text: string }) {
  return (
    <span className="staff-truncate" title={text}>
      {text}
    </span>
  );
}

function RowAction({ row, onRemove }: { row: StaffRow; onRemove: (row: StaffRow) => void }) {
  if (row.isYou) return <span className="staff-you">You</span>;
  if (row.isRemoved) return <span aria-hidden="true">—</span>;
  return (
    <Button tone="quiet" label={`Remove ${row.name}`} onClick={() => onRemove(row)}>
      Remove
    </Button>
  );
}

const COLUMNS = [
  { key: 'name', label: 'Name', sortable: false },
  { key: 'email', label: 'Email', sortable: false },
  { key: 'status', label: 'Status', sortable: false },
  { key: 'action', label: 'Action', sortable: false },
] as const;

/**
 * Everyone who works at the café. The cells are rendered pieces (ellipsis with
 * the full text in a title, a status word, a button), which the table cannot
 * sort or search, so the list arrives already in order: by name, leavers last.
 */
export function StaffTable({
  rows,
  onRemove,
}: {
  rows: readonly StaffRow[];
  onRemove: (row: StaffRow) => void;
}) {
  const cells = rows.map((row) => ({
    name: <Truncated text={row.name} />,
    email: <Truncated text={row.email} />,
    status: row.isRemoved ? (
      <Status tone="neutral" label="Removed" />
    ) : (
      <Status tone="ok" label="Active" />
    ),
    action: <RowAction row={row} onRemove={onRemove} />,
  }));
  return (
    <div className="staff-table">
      <DataTable
        caption="Everyone who works at the café"
        rows={cells}
        columns={COLUMNS}
        searchable={false}
        pageSize={50}
      />
    </div>
  );
}
