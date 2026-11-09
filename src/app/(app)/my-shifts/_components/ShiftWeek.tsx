import type { ReactNode } from 'react';

import type { MyShift, MyShiftWeek } from '@/lib/rota/my-shifts';
import { ShiftCard } from './ShiftCard';

interface ShiftWeekProps {
  week: MyShiftWeek;
  /** What goes beside each shift, such as a swap button. */
  actionFor?: (shift: MyShift) => ReactNode;
}

/** "Week of 11 Nov" and that week's shifts, soonest first. */
export function ShiftWeek({ week, actionFor }: ShiftWeekProps) {
  const headingId = `week-${week.weekStart}`;
  return (
    <section className="my-shifts-week" aria-labelledby={headingId}>
      <h2 id={headingId} className="my-shifts-week-label">
        {week.label}
      </h2>
      <ul className="my-shifts-list">
        {week.shifts.map((shift) => (
          <ShiftCard key={shift.id} shift={shift} action={actionFor?.(shift)} />
        ))}
      </ul>
    </section>
  );
}
