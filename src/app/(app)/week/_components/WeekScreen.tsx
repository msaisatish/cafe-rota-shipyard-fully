'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Toasts, useToasts } from '@/components/ui_blocks/Toasts';
import { Button } from '@/components/ui_foundation/Button';
import type { ShiftRow, WeekPlan } from '@/lib/rota/plan';
import { AddShiftDialog } from './AddShiftDialog';
import { PublishWeekDialog } from './PublishWeekDialog';
import { RemoveShiftDialog } from './RemoveShiftDialog';
import { ShiftTable } from './ShiftTable';
import { WeekHeader } from './WeekHeader';

import './week.css';

function NoStaffYet() {
  return (
    <div className="week-empty">
      <p>Add your staff first, then plan their shifts.</p>
      <Link href="/staff">Go to Staff</Link>
    </div>
  );
}

function NoShiftsYet({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="week-empty">
      <p>
        No shifts this week yet. Add the first one; staff won&apos;t see anything until you publish.
      </p>
      <Button tone="primary" onClick={onAdd}>
        Add a shift
      </Button>
    </div>
  );
}

/** The Plan the week screen: one week's shifts, add, remove, publish (DESIGN.md section 2). */
export function WeekScreen({ plan }: { plan: WeekPlan }) {
  const router = useRouter();
  const toasts = useToasts();
  const [isAdding, setIsAdding] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [removing, setRemoving] = useState<ShiftRow | null>(null);
  const hasStaff = plan.staff.length > 0;
  const hasShifts = plan.shifts.length > 0;

  function changed(text: string) {
    toasts.show({ id: `week-${Date.now()}`, tone: 'ok', text });
    router.refresh();
  }

  function added() {
    setIsAdding(false);
    changed('The shift was added.');
  }

  function published() {
    setIsPublishing(false);
    changed('The week is published. Staff can see their shifts now.');
  }

  function removed(shift: ShiftRow) {
    setRemoving(null);
    changed(`${shift.name}'s ${shift.weekday} shift was removed.`);
  }

  const openAdd = () => setIsAdding(true);

  return (
    <div className="week">
      <WeekHeader
        plan={plan}
        onAdd={hasStaff ? openAdd : null}
        onPublish={() => setIsPublishing(true)}
      />
      {!hasStaff && !hasShifts ? <NoStaffYet /> : null}
      {hasStaff && !hasShifts ? <NoShiftsYet onAdd={openAdd} /> : null}
      {hasShifts ? (
        <ShiftTable
          caption={`Shifts for the week of ${plan.dayMonth}`}
          shifts={plan.shifts}
          onRemove={setRemoving}
        />
      ) : null}
      {isAdding ? (
        <AddShiftDialog plan={plan} onClose={() => setIsAdding(false)} onAdded={added} />
      ) : null}
      {isPublishing ? (
        <PublishWeekDialog
          weekStart={plan.weekStart}
          dayMonth={plan.dayMonth}
          onClose={() => setIsPublishing(false)}
          onPublished={published}
        />
      ) : null}
      {removing ? (
        <RemoveShiftDialog shift={removing} onClose={() => setRemoving(null)} onRemoved={removed} />
      ) : null}
      <Toasts toasts={toasts.toasts} onDismiss={toasts.dismiss} />
    </div>
  );
}
