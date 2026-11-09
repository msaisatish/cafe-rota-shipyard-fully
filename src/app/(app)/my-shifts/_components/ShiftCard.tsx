import type { ReactNode } from 'react';

import type { MyShift } from '@/lib/rota/my-shifts';
import { ShiftTimes } from './ShiftTimes';

/** One shift in the list: day and times, with room for one action beside them. */
export function ShiftCard({ shift, action }: { shift: MyShift; action?: ReactNode }) {
  return (
    <li className="my-shift">
      <div>
        <p className="my-shift-day">{shift.day}</p>
        <ShiftTimes shift={shift} className="my-shift-times" />
      </div>
      {action ? <div className="my-shift-action">{action}</div> : null}
    </li>
  );
}
