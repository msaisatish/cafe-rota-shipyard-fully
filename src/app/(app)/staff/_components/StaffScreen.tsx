'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Toasts, useToasts } from '@/components/ui_blocks/Toasts';
import { Button } from '@/components/ui_foundation/Button';
import { isOnlyYou, type StaffRow } from '@/lib/staff/rows';
import { AddStaffDialog, type AddedStaff } from './AddStaffDialog';
import { RemoveStaffDialog } from './RemoveStaffDialog';
import { StaffTable } from './StaffTable';

import './staff.css';

function addedMessage({ name, outcome }: AddedStaff): string {
  if (outcome === 'linked') {
    return `${name} is on the staff list. They already had an account and keep its password.`;
  }
  if (outcome === 'reactivated') {
    return `${name} is back on the staff list. Tell them their new starting password.`;
  }
  return `${name} is on the staff list. Tell them their starting password.`;
}

/** The Staff screen: who works here, add and remove people (DESIGN.md section 3). */
export function StaffScreen({ rows }: { rows: readonly StaffRow[] }) {
  const router = useRouter();
  const toasts = useToasts();
  const [isAdding, setIsAdding] = useState(false);
  const [leaving, setLeaving] = useState<StaffRow | null>(null);
  const isEmpty = isOnlyYou(rows);
  const hasLeavers = rows.some((row) => row.isRemoved);

  function added(person: AddedStaff) {
    setIsAdding(false);
    toasts.show({ id: `added-${Date.now()}`, tone: 'ok', text: addedMessage(person) });
    router.refresh();
  }

  function removed(person: StaffRow) {
    setLeaving(null);
    toasts.show({ id: `removed-${Date.now()}`, tone: 'ok', text: `${person.name} was removed.` });
    router.refresh();
  }

  const addButton = (
    <Button tone="primary" onClick={() => setIsAdding(true)}>
      Add a staff member
    </Button>
  );

  return (
    <>
      <div className="staff-head">
        <h1>Staff</h1>
        {isEmpty ? null : addButton}
      </div>
      {isEmpty ? (
        <div className="staff-empty">
          <p>It&apos;s just you so far. Add the people who work here, then plan their shifts.</p>
          {addButton}
        </div>
      ) : null}
      {isEmpty && !hasLeavers ? null : <StaffTable rows={rows} onRemove={setLeaving} />}
      {isAdding ? <AddStaffDialog onClose={() => setIsAdding(false)} onAdded={added} /> : null}
      {leaving ? (
        <RemoveStaffDialog person={leaving} onClose={() => setLeaving(null)} onRemoved={removed} />
      ) : null}
      <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </>
  );
}
