import { prisma } from '@/lib/prisma';

/**
 * Database reads and writes for the rota. One café, so there is no
 * organisation to scope by. A week's row is made on its first shift.
 */

export interface RotaWeekRecord {
  id: string;
  weekStart: string;
  publishedAt: Date | null;
}

export interface ShiftRecord {
  id: string;
  weekId: string;
  memberId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface ShiftNameRecord {
  id: string;
  name: string;
  removedAt: Date | null;
}

const weekFields = { id: true, weekStart: true, publishedAt: true } as const;
const shiftFields = {
  id: true,
  weekId: true,
  memberId: true,
  startsAt: true,
  endsAt: true,
} as const;

export async function findWeek(weekStart: string): Promise<RotaWeekRecord | null> {
  return prisma.rotaWeek.findUnique({ where: { weekStart }, select: weekFields });
}

/** The week's row, made as a draft if this is its first shift. */
export async function ensureWeek(weekStart: string): Promise<RotaWeekRecord> {
  return prisma.rotaWeek.upsert({
    where: { weekStart },
    create: { weekStart },
    update: {},
    select: weekFields,
  });
}

export async function markWeekPublished(weekId: string, at: Date): Promise<RotaWeekRecord> {
  return prisma.rotaWeek.update({
    where: { id: weekId },
    data: { publishedAt: at },
    select: weekFields,
  });
}

/** A week's shifts in time order. A week holds a few dozen at most, so no paging. */
export async function listShiftsOfWeek(weekId: string): Promise<ShiftRecord[]> {
  return prisma.shift.findMany({
    where: { weekId },
    orderBy: { startsAt: 'asc' },
    select: shiftFields,
  });
}

export async function countShiftsOfWeek(weekId: string): Promise<number> {
  return prisma.shift.count({ where: { weekId } });
}

export async function findShiftById(id: string): Promise<ShiftRecord | null> {
  return prisma.shift.findUnique({ where: { id }, select: shiftFields });
}

export async function createShift(input: Omit<ShiftRecord, 'id'>): Promise<ShiftRecord> {
  return prisma.shift.create({ data: input, select: shiftFields });
}

/** True when a shift was there to delete. */
export async function deleteShift(id: string): Promise<boolean> {
  const { count } = await prisma.shift.deleteMany({ where: { id } });
  return count > 0;
}

/** Names of the people on some shifts, including anyone who has since left. */
export async function findShiftNames(memberIds: string[]): Promise<ShiftNameRecord[]> {
  if (memberIds.length === 0) return [];
  return prisma.cafeMember.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, name: true, removedAt: true },
  });
}

/**
 * One person's shifts that have not ended yet, in published weeks only, soonest
 * first. A person works a handful of shifts ahead, so no paging.
 */
export async function listUpcomingPublishedShifts(
  memberId: string,
  now: Date,
): Promise<ShiftRecord[]> {
  return prisma.shift.findMany({
    where: { memberId, endsAt: { gt: now }, week: { publishedAt: { not: null } } },
    orderBy: { startsAt: 'asc' },
    select: shiftFields,
  });
}
