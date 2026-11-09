import { formatDayMonth, localDateOf } from '@/lib/cafe-time/time';
import { findMemberById, listActiveMembers } from '@/lib/members/queries';
import type { CafeMember } from '@/lib/members/schema';
import { findShiftNames } from '@/lib/rota/queries';
import { describeShift, isSchedulable, upcomingPublishedShiftsFor } from '@/lib/rota/service';
import {
  approveSwapAtomically,
  countWaitingSwaps,
  createSwapIfNoneWaiting,
  findShiftTimes,
  findSwapById,
  listRecentlyDecidedSwaps,
  listSwapsAskedBy,
  listWaitingShiftIdsOf,
  listWaitingSwaps,
  turnDownSwap,
  turnDownWaitingSwapsOf,
  type ShiftTimesRecord,
  type SwapRecord,
} from './queries';
import { toSwapStatus, type AskSwapInput, type SwapDecision, type SwapStatus } from './schema';
import type { MySwapsView, SwapRow } from './view';

/** The rules for asking to swap a shift and for the manager deciding. */

export const NOT_YOUR_SHIFT = 'You can only ask to swap one of your own upcoming shifts.';
export const NOT_A_COLLEAGUE = 'Choose a colleague who is on the staff list.';
export const ALREADY_ASKED = 'You have already asked to swap this shift. Your manager decides.';
export const SWAP_GONE = 'That swap request could not be found.';
export const ALREADY_DECIDED = 'That swap request has already been decided.';
export const SHIFT_CHANGED = 'That shift has changed since the request, so nothing changed.';

export type SwapFailure = {
  ok: false;
  reason: 'invalid' | 'missing' | 'conflict';
  message: string;
  field?: keyof AskSwapInput;
};
export type AskSwapResult = { ok: true; swap: SwapRecord } | SwapFailure;
export type DecideSwapResult = { ok: true; status: SwapStatus } | SwapFailure;

export { countWaitingSwaps };

/** A staff member asks a named colleague to take one of their own upcoming published shifts. */
export async function askForSwap(input: {
  asker: CafeMember;
  request: AskSwapInput;
  now?: Date;
}): Promise<AskSwapResult> {
  const { asker, request } = input;
  const ownShifts = await upcomingPublishedShiftsFor(asker.id, input.now);
  if (!ownShifts.some((shift) => shift.id === request.shiftId)) {
    return { ok: false, reason: 'invalid', field: 'shiftId', message: NOT_YOUR_SHIFT };
  }
  const colleague = await findMemberById(request.toMemberId);
  if (!isSchedulable(colleague) || colleague.id === asker.id) {
    return { ok: false, reason: 'invalid', field: 'toMemberId', message: NOT_A_COLLEAGUE };
  }
  const swap = await createSwapIfNoneWaiting({
    shiftId: request.shiftId,
    fromMemberId: asker.id,
    toMemberId: colleague.id,
  });
  if (!swap) return { ok: false, reason: 'conflict', message: ALREADY_ASKED };
  return { ok: true, swap };
}

/** The manager approves (the shift changes hands) or turns down a waiting request. */
export async function decideSwap(input: {
  swapId: string;
  decision: SwapDecision;
  now?: Date;
}): Promise<DecideSwapResult> {
  const at = input.now ?? new Date();
  if (input.decision === 'turn_down') {
    if (await turnDownSwap(input.swapId, at)) return { ok: true, status: 'turned_down' };
    const swap = await findSwapById(input.swapId);
    if (!swap) return { ok: false, reason: 'missing', message: SWAP_GONE };
    return { ok: false, reason: 'conflict', message: ALREADY_DECIDED };
  }
  const outcome = await approveSwapAtomically(input.swapId, at);
  if (outcome === 'approved') return { ok: true, status: 'approved' };
  if (outcome === 'missing') return { ok: false, reason: 'missing', message: SWAP_GONE };
  const message = outcome === 'already-decided' ? ALREADY_DECIDED : SHIFT_CHANGED;
  return { ok: false, reason: 'conflict', message };
}

/** Someone left: nothing they asked for, or were asked to take, can still be approved. */
export async function turnDownSwapsOf(memberId: string, now: Date = new Date()): Promise<void> {
  await turnDownWaitingSwapsOf(memberId, now);
}

interface SwapWords {
  /** "Tue 12 Nov 08:00–14:00" */
  short: string;
  /** "Tuesday 12 Nov 08:00–14:00" */
  full: string;
}

function shiftWords(shift: ShiftTimesRecord | undefined): SwapWords {
  if (!shift) return { short: 'A removed shift', full: 'A removed shift' };
  const { weekday, day, start, end } = describeShift(shift);
  const times = `${start}–${end}`;
  const dayMonth = formatDayMonth(localDateOf(shift.startsAt));
  return { short: `${weekday.slice(0, 3)} ${dayMonth} ${times}`, full: `${day} ${times}` };
}

async function describeSwaps(swaps: SwapRecord[]) {
  const shiftIds = [...new Set(swaps.map((swap) => swap.shiftId))];
  const memberIds = [...new Set(swaps.flatMap((swap) => [swap.fromMemberId, swap.toMemberId]))];
  const [shifts, people] = await Promise.all([findShiftTimes(shiftIds), findShiftNames(memberIds)]);
  const shiftById = new Map(shifts.map((shift) => [shift.id, shift]));
  const nameById = new Map(people.map((person) => [person.id, person.name]));
  return swaps.map((swap) => ({
    swap,
    words: shiftWords(shiftById.get(swap.shiftId)),
    from: nameById.get(swap.fromMemberId) ?? 'Someone who left',
    to: nameById.get(swap.toMemberId) ?? 'Someone who left',
  }));
}

/** The manager's list: waiting requests first (oldest first), then the latest decided. */
export async function swapRequestsForManager(): Promise<SwapRow[]> {
  const [waiting, decided] = await Promise.all([listWaitingSwaps(), listRecentlyDecidedSwaps()]);
  const described = await describeSwaps([...waiting, ...decided]);
  return described.map(({ swap, words, from, to }) => ({
    id: swap.id,
    shift: words.short,
    shiftInFull: words.full,
    from,
    to,
    status: toSwapStatus(swap.status),
  }));
}

/** What My shifts needs for swapping: this person's requests and who they could ask. */
export async function mySwapsFor(member: CafeMember): Promise<MySwapsView> {
  const [asked, waitingShiftIds, members] = await Promise.all([
    listSwapsAskedBy(member.id).then(describeSwaps),
    listWaitingShiftIdsOf(member.id),
    listActiveMembers(),
  ]);
  return {
    requests: asked.map(({ swap, words, to }) => ({
      id: swap.id,
      shift: words.full,
      to,
      status: toSwapStatus(swap.status),
    })),
    waitingShiftIds,
    colleagues: members
      .filter((other) => isSchedulable(other) && other.id !== member.id)
      .map(({ id, name }) => ({ id, name })),
  };
}
