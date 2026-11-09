import { prisma } from '@/lib/prisma';

/**
 * Database reads and writes for swap requests. One café, so there is no
 * organisation to scope by. Member ids are CafeMember ids.
 */

export interface SwapRecord {
  id: string;
  shiftId: string;
  fromMemberId: string;
  toMemberId: string;
  status: string;
  decidedAt: Date | null;
  createdAt: Date;
}

export interface ShiftTimesRecord {
  id: string;
  startsAt: Date;
  endsAt: Date;
}

export type ApproveOutcome = 'approved' | 'missing' | 'already-decided' | 'shift-changed';

/** The most decided requests a list shows; a café makes a few a week. */
export const DECIDED_SHOWN = 50;

const swapFields = {
  id: true,
  shiftId: true,
  fromMemberId: true,
  toMemberId: true,
  status: true,
  decidedAt: true,
  createdAt: true,
} as const;

/** Thrown inside a transaction to undo what it already wrote. */
class DecidedMeanwhile extends Error {}

/**
 * Null when the shift already has a waiting request. Serializable, so two taps
 * at once cannot both get through.
 */
export async function createSwapIfNoneWaiting(input: {
  shiftId: string;
  fromMemberId: string;
  toMemberId: string;
}): Promise<SwapRecord | null> {
  return prisma.$transaction(
    async (tx) => {
      const waiting = await tx.swapRequest.findFirst({
        where: { shiftId: input.shiftId, status: 'waiting' },
        select: { id: true },
      });
      if (waiting) return null;
      return tx.swapRequest.create({
        data: { ...input, status: 'waiting' },
        select: swapFields,
      });
    },
    { isolationLevel: 'Serializable' },
  );
}

/** Every waiting request, oldest first. Few at any time, so no paging. */
export async function listWaitingSwaps(): Promise<SwapRecord[]> {
  return prisma.swapRequest.findMany({
    where: { status: 'waiting' },
    orderBy: { createdAt: 'asc' },
    select: swapFields,
  });
}

/** The latest decided requests, newest first. */
export async function listRecentlyDecidedSwaps(): Promise<SwapRecord[]> {
  return prisma.swapRequest.findMany({
    where: { status: { not: 'waiting' } },
    orderBy: { createdAt: 'desc' },
    take: DECIDED_SHOWN,
    select: swapFields,
  });
}

/** One person's own requests, newest first. */
export async function listSwapsAskedBy(memberId: string): Promise<SwapRecord[]> {
  return prisma.swapRequest.findMany({
    where: { fromMemberId: memberId },
    orderBy: { createdAt: 'desc' },
    take: DECIDED_SHOWN,
    select: swapFields,
  });
}

export async function countWaitingSwaps(): Promise<number> {
  return prisma.swapRequest.count({ where: { status: 'waiting' } });
}

export async function findSwapById(id: string): Promise<SwapRecord | null> {
  return prisma.swapRequest.findUnique({ where: { id }, select: swapFields });
}

/** Start and end of some shifts, for describing the requests on them. */
export async function findShiftTimes(shiftIds: string[]): Promise<ShiftTimesRecord[]> {
  if (shiftIds.length === 0) return [];
  return prisma.shift.findMany({
    where: { id: { in: shiftIds } },
    select: { id: true, startsAt: true, endsAt: true },
  });
}

/**
 * Hands the shift to the colleague and marks the request approved, together or
 * not at all. Checked inside the transaction: the request is still waiting, the
 * colleague is still current staff, the shift is still the asker's.
 */
export async function approveSwapAtomically(swapId: string, at: Date): Promise<ApproveOutcome> {
  try {
    return await prisma.$transaction(async (tx) => {
      const swap = await tx.swapRequest.findUnique({ where: { id: swapId }, select: swapFields });
      if (!swap) return 'missing';
      if (swap.status !== 'waiting') return 'already-decided';
      const colleague = await tx.cafeMember.findUnique({
        where: { id: swap.toMemberId },
        select: { role: true, removedAt: true },
      });
      if (!colleague || colleague.role !== 'staff' || colleague.removedAt) return 'shift-changed';
      const moved = await tx.shift.updateMany({
        where: { id: swap.shiftId, memberId: swap.fromMemberId },
        data: { memberId: swap.toMemberId },
      });
      if (moved.count === 0) return 'shift-changed';
      const marked = await tx.swapRequest.updateMany({
        where: { id: swapId, status: 'waiting' },
        data: { status: 'approved', decidedAt: at },
      });
      if (marked.count === 0) throw new DecidedMeanwhile();
      return 'approved';
    });
  } catch (error) {
    if (error instanceof DecidedMeanwhile) return 'already-decided';
    throw error;
  }
}

/** True when the request was still waiting and is now turned down. */
export async function turnDownSwap(swapId: string, at: Date): Promise<boolean> {
  const { count } = await prisma.swapRequest.updateMany({
    where: { id: swapId, status: 'waiting' },
    data: { status: 'turned_down', decidedAt: at },
  });
  return count > 0;
}

/** Everything still waiting that this person asked for or was asked to take. */
export async function turnDownWaitingSwapsOf(memberId: string, at: Date): Promise<void> {
  const data = { status: 'turned_down', decidedAt: at };
  await prisma.$transaction([
    prisma.swapRequest.updateMany({ where: { fromMemberId: memberId, status: 'waiting' }, data }),
    prisma.swapRequest.updateMany({ where: { toMemberId: memberId, status: 'waiting' }, data }),
  ]);
}

/** The shifts of this person's that have a request waiting. */
export async function listWaitingShiftIdsOf(memberId: string): Promise<string[]> {
  const rows = await prisma.swapRequest.findMany({
    where: { fromMemberId: memberId, status: 'waiting' },
    select: { shiftId: true },
  });
  return rows.map((row) => row.shiftId);
}
