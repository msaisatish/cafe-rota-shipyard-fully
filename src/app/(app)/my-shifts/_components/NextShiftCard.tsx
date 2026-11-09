import type { ReactNode } from 'react';

import type { MyShift } from '@/lib/rota/my-shifts';
import { ShiftTimes } from './ShiftTimes';

/** The answer to "when am I on next?", first and larger (DESIGN.md section 4). */
export function NextShiftCard({ shift, action }: { shift: MyShift; action?: ReactNode }) {
  return (
    <section className="my-shift my-shift-next" aria-labelledby="next-shift-label">
      <h2 id="next-shift-label" className="my-shift-label">
        Your next shift
      </h2>
      <p className="my-shift-next-day">{shift.day}</p>
      <ShiftTimes shift={shift} className="my-shift-next-times" />
      {action ? <div className="my-shift-action">{action}</div> : null}
    </section>
  );
}
