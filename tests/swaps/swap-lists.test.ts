import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { findMemberById } from '@/lib/members/queries';
import { removeMember } from '@/lib/members/service';
import { addShift, publishWeek } from '@/lib/rota/service';
import {
  askForSwap,
  countWaitingSwaps,
  decideSwap,
  mySwapsFor,
  swapRequestsForManager,
} from '@/lib/swaps/service';
import { fakeRotaDb } from '../rota/fake-rota-db';

vi.mock('@/lib/prisma', async () => ({
  prisma: (await import('../rota/fake-rota-db')).fakeRotaDb.client,
}));
vi.mock('@/components/auth/session', () => ({
  revokeAllSessions: vi.fn(async () => 1),
  getSessionUser: vi.fn(async () => null),
}));

// Tuesday 10 Nov 2026, 12:00 in London (GMT, so the same in UTC).
const now = new Date('2026-11-10T12:00:00Z');

async function member(id: string) {
  const found = await findMemberById(id);
  if (!found) throw new Error(`No member ${id}`);
  return found;
}

async function plan(day: string, memberId = 'member_sam') {
  const result = await addShift({ memberId, day, startTime: '08:00', endTime: '14:00' });
  if (!result.ok) throw new Error(result.message);
  return result.shift.id;
}

async function samAsks(shiftId: string, toMemberId = 'member_alex') {
  const result = await askForSwap({
    asker: await member('member_sam'),
    request: { shiftId, toMemberId },
    now,
  });
  if (!result.ok) throw new Error(result.message);
  return result.swap.id;
}

beforeEach(() => {
  fakeRotaDb.reset();
  vi.stubEnv('CAFE_TIME_ZONE', 'Europe/London');
  for (const id of ['boss', 'sam', 'alex', 'kim', 'jo']) {
    fakeRotaDb.addUser({ id, email: `${id}@cafe.test`, createdAt: new Date('2026-01-01') });
  }
  fakeRotaDb.addMember({ userId: 'boss', name: 'Bea', role: 'manager' });
  fakeRotaDb.addMember({ userId: 'sam', name: 'Sam' });
  fakeRotaDb.addMember({ userId: 'alex', name: 'Alex' });
  fakeRotaDb.addMember({ userId: 'kim', name: 'Kim' });
  fakeRotaDb.addMember({ userId: 'jo', name: 'Jo', removedAt: new Date('2026-10-01') });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the manager's list", () => {
  it('shows waiting requests first, in words, and counts them for the nav', async () => {
    const thursday = await plan('2026-11-12');
    const friday = await plan('2026-11-13');
    await publishWeek('2026-11-09');
    const first = await samAsks(thursday);
    await decideSwap({ swapId: first, decision: 'turn_down', now });
    await samAsks(friday, 'member_kim');

    const rows = await swapRequestsForManager();
    expect(rows.map((row) => [row.shift, row.from, row.to, row.status])).toEqual([
      ['Fri 13 Nov 08:00–14:00', 'Sam', 'Kim', 'waiting'],
      ['Thu 12 Nov 08:00–14:00', 'Sam', 'Alex', 'turned_down'],
    ]);
    expect(rows[0]?.shiftInFull).toBe('Friday 13 Nov 08:00–14:00');
    expect(await countWaitingSwaps()).toBe(1);
  });
});

describe('My shifts swap parts', () => {
  it('offers current staff other than yourself and marks waiting shifts', async () => {
    const thursday = await plan('2026-11-12');
    await publishWeek('2026-11-09');
    await samAsks(thursday);
    const view = await mySwapsFor(await member('member_sam'));
    expect(view.colleagues.map((colleague) => colleague.name)).toEqual(['Alex', 'Kim']);
    expect(view.waitingShiftIds).toEqual([thursday]);
    expect(view.requests).toEqual([
      {
        id: expect.any(String),
        shift: 'Thursday 12 Nov 08:00–14:00',
        to: 'Alex',
        status: 'waiting',
      },
    ]);
    expect((await mySwapsFor(await member('member_alex'))).requests).toEqual([]);
  });
});

describe('removing someone from the staff list', () => {
  it('turns down the waiting requests they asked for or were asked to take', async () => {
    const thursday = await plan('2026-11-12');
    const friday = await plan('2026-11-13');
    const kimShift = await plan('2026-11-14', 'member_kim');
    await publishWeek('2026-11-09');
    const fromSam = await samAsks(thursday);
    const toAlex = await samAsks(friday, 'member_kim');
    const kim = await member('member_kim');
    const fromKim = await askForSwap({
      asker: kim,
      request: { shiftId: kimShift, toMemberId: 'member_alex' },
      now,
    });

    await removeMember({ memberId: 'member_kim', removedBy: await member('member_boss') });

    const statusOf = (id: string) => fakeRotaDb.swapRequests.find((row) => row.id === id)?.status;
    expect(statusOf(fromSam)).toBe('waiting');
    expect(statusOf(toAlex)).toBe('turned_down');
    expect(fromKim.ok && statusOf(fromKim.swap.id)).toBe('turned_down');
  });
});
