import {
  addDays,
  daysOfWeek,
  formatDay,
  formatDayMonth,
  formatTime,
  formatWeekLabel,
  formatWeekday,
  localDateOf,
  localToUtc,
  mondayOf,
  weekStartOf,
} from '@/lib/cafe-time/time';
import { findMemberById, listActiveMembers } from '@/lib/members/queries';
import type { CafeMember } from '@/lib/members/schema';
import type { MyShift } from './my-shifts';
import type { ShiftRow, StaffChoice, WeekPlan } from './plan';
import {
  countShiftsOfWeek,
  createShift,
  deleteShift,
  ensureWeek,
  findShiftNames,
  findWeek,
  listShiftsOfWeek,
  listUpcomingPublishedShifts,
  markWeekPublished,
  type ShiftRecord,
} from './queries';
import { END_BEFORE_START, type AddShiftInput } from './schema';

export const NOT_STAFF = 'Only someone on the staff list can be put on a shift.';
export const NOTHING_TO_PUBLISH = 'Add a shift before publishing this week.';
export const SHIFT_GONE = 'That shift has already been removed.';

export type AddShiftResult =
  | { ok: true; shift: ShiftRecord; weekStart: string }
  | { ok: false; field?: keyof AddShiftInput; message: string };
export type RemoveShiftResult = { ok: true } | { ok: false; message: string };
export type PublishWeekResult = { ok: true; publishedAt: Date } | { ok: false; message: string };

/** The week the café is in right now. */
export function currentWeekStart(now: Date = new Date()): string {
  return weekStartOf(now);
}

/** Only current staff go on shifts; the manager plans the rota and is not on it. */
export function isSchedulable(member: CafeMember | null): member is CafeMember {
  return member !== null && member.role === 'staff' && member.removedAt === null;
}

/** "Tuesday", "Tuesday 10 Nov", "08:00", "14:00" for a shift, café time. */
export function describeShift(shift: Pick<ShiftRecord, 'startsAt' | 'endsAt'>) {
  const date = localDateOf(shift.startsAt);
  return {
    weekday: formatWeekday(date),
    day: formatDay(date),
    start: formatTime(shift.startsAt),
    end: formatTime(shift.endsAt),
  };
}

async function shiftRows(shifts: ShiftRecord[]): Promise<ShiftRow[]> {
  const memberIds = [...new Set(shifts.map((shift) => shift.memberId))];
  const names = new Map((await findShiftNames(memberIds)).map((person) => [person.id, person]));
  return shifts.map((shift) => {
    const person = names.get(shift.memberId);
    const name = person?.name ?? 'Someone who left';
    const who = person && person.removedAt === null ? name : `${name} (left)`;
    return { id: shift.id, who, name, ...describeShift(shift) };
  });
}

async function schedulableStaff(): Promise<StaffChoice[]> {
  const members = await listActiveMembers();
  return members.filter(isSchedulable).map(({ id, name }) => ({ id, name }));
}

/** Everything the Plan the week screen needs for one week. An unplanned week has no row yet. */
export async function weekPlanFor(weekStart: string): Promise<WeekPlan> {
  const week = await findWeek(weekStart);
  const [shifts, staff] = await Promise.all([
    week ? listShiftsOfWeek(week.id).then(shiftRows) : Promise.resolve([]),
    schedulableStaff(),
  ]);
  return {
    weekStart,
    previousWeek: addDays(weekStart, -7),
    nextWeek: addDays(weekStart, 7),
    label: formatWeekLabel(weekStart),
    dayMonth: formatDayMonth(weekStart),
    isPublished: week?.publishedAt != null,
    shifts,
    days: daysOfWeek(weekStart).map((date) => ({ date, label: formatDay(date) })),
    staff,
  };
}

/** Puts a member of staff on a shift, starting the week as a draft if it is new. */
export async function addShift(input: AddShiftInput): Promise<AddShiftResult> {
  const member = await findMemberById(input.memberId);
  if (!isSchedulable(member)) return { ok: false, field: 'memberId', message: NOT_STAFF };

  const startsAt = localToUtc(input.day, input.startTime);
  const endsAt = localToUtc(input.day, input.endTime);
  // On a clock-change night two different times can be the same instant.
  if (endsAt <= startsAt) return { ok: false, field: 'endTime', message: END_BEFORE_START };

  const weekStart = mondayOf(input.day);
  const week = await ensureWeek(weekStart);
  const shift = await createShift({ weekId: week.id, memberId: member.id, startsAt, endsAt });
  return { ok: true, shift, weekStart };
}

/** Takes a shift off the rota, published or not: staff see the change at once. */
export async function removeShift(shiftId: string): Promise<RemoveShiftResult> {
  const wasThere = await deleteShift(shiftId);
  return wasThere ? { ok: true } : { ok: false, message: SHIFT_GONE };
}

/** Lets staff see the week. Publishing twice keeps the first time. */
export async function publishWeek(weekStart: string): Promise<PublishWeekResult> {
  const week = await findWeek(weekStart);
  if (!week || (await countShiftsOfWeek(week.id)) === 0) {
    return { ok: false, message: NOTHING_TO_PUBLISH };
  }
  if (week.publishedAt) return { ok: true, publishedAt: week.publishedAt };
  const published = await markWeekPublished(week.id, new Date());
  return { ok: true, publishedAt: published.publishedAt ?? new Date() };
}

/**
 * A staff member's own shifts for My shifts: only weeks the manager has
 * published, only shifts not yet over, soonest first.
 */
export async function upcomingPublishedShiftsFor(
  memberId: string,
  now: Date = new Date(),
): Promise<MyShift[]> {
  const shifts = await listUpcomingPublishedShifts(memberId, now);
  return shifts.map((shift) => ({
    id: shift.id,
    weekStart: weekStartOf(shift.startsAt),
    ...describeShift(shift),
  }));
}
