import type { MyShift, MyShiftsView } from '@/lib/rota/my-shifts';
import type { MySwapsView } from '@/lib/swaps/view';
import { MySwapRequests } from './MySwapRequests';
import { NextShiftCard } from './NextShiftCard';
import { ShiftWeek } from './ShiftWeek';
import { SwapAction } from './SwapAction';

import './my-shifts.css';

/** The My shifts screen: next shift, the rest week by week, then swaps (DESIGN.md section 4). */
export function MyShiftsScreen({ view, swaps }: { view: MyShiftsView; swaps: MySwapsView }) {
  const swapActionFor = (shift: MyShift) => (
    <SwapAction
      shift={shift}
      colleagues={swaps.colleagues}
      isWaiting={swaps.waitingShiftIds.includes(shift.id)}
    />
  );
  return (
    <div className="my-shifts">
      <h1>My shifts</h1>
      {view.next ? (
        <>
          <NextShiftCard shift={view.next} action={swapActionFor(view.next)} />
          {view.later.map((week) => (
            <ShiftWeek key={week.weekStart} week={week} actionFor={swapActionFor} />
          ))}
        </>
      ) : (
        <p className="my-shifts-empty">
          No shifts for you yet. When your manager publishes a week, your shifts appear here.
        </p>
      )}
      <MySwapRequests requests={swaps.requests} />
    </div>
  );
}
