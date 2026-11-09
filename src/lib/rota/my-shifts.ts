/** What the My shifts screen shows, safe to send to the browser. No database here. */

import { formatDayMonth } from '@/lib/cafe-time/time';

export interface MyShift {
  id: string;
  /** The café-local Monday of the shift's week, "2026-11-09" */
  weekStart: string;
  /** "Tuesday" */
  weekday: string;
  /** "Tuesday 10 Nov" */
  day: string;
  /** "08:00", café time */
  start: string;
  end: string;
}

export interface MyShiftWeek {
  weekStart: string;
  /** "Week of 9 Nov" */
  label: string;
  shifts: MyShift[];
}

export interface MyShiftsView {
  next: MyShift | null;
  /** The shifts after the next one, under their week headings. */
  later: MyShiftWeek[];
}

/** Splits soonest-first shifts into the next one and the rest, week by week. */
export function groupMyShifts(shifts: MyShift[]): MyShiftsView {
  const [next, ...rest] = shifts;
  const later: MyShiftWeek[] = [];
  for (const shift of rest) {
    const current = later.at(-1);
    if (current?.weekStart === shift.weekStart) {
      current.shifts.push(shift);
      continue;
    }
    const label = `Week of ${formatDayMonth(shift.weekStart)}`;
    later.push({ weekStart: shift.weekStart, label, shifts: [shift] });
  }
  return { next: next ?? null, later };
}
