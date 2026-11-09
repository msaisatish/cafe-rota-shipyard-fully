/** What the Plan the week screen shows, safe to send to the browser. No database here. */

export interface ShiftRow {
  id: string;
  /** "Sam", or "Sam (left)" for someone who has since been removed. */
  who: string;
  /** The plain name, for "Remove Sam's Tuesday shift". */
  name: string;
  /** "Tuesday" */
  weekday: string;
  /** "Tuesday 10 Nov" */
  day: string;
  /** "08:00", café time */
  start: string;
  end: string;
}

export interface DayChoice {
  /** "2026-11-10" */
  date: string;
  /** "Tuesday 10 Nov" */
  label: string;
}

export interface StaffChoice {
  id: string;
  name: string;
}

export interface WeekPlan {
  /** The Monday, "2026-11-09" */
  weekStart: string;
  previousWeek: string;
  nextWeek: string;
  /** "Week of Monday 9 Nov" */
  label: string;
  /** "9 Nov" */
  dayMonth: string;
  isPublished: boolean;
  shifts: ShiftRow[];
  days: DayChoice[];
  /** Current staff who can be put on a shift, by name. */
  staff: StaffChoice[];
}
