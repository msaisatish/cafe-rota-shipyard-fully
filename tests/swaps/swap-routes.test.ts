import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionUser } from '@/components/auth/session';
import { GET as listSwaps, POST as askSwap } from '@/app/api/swaps/route';
import { POST as decide } from '@/app/api/swaps/[swapId]/route';
import { addShift, publishWeek } from '@/lib/rota/service';
import { SHIFT_CHANGED } from '@/lib/swaps/service';
import { fakeDb } from '../members/fake-db';
import { fakeRotaDb } from '../rota/fake-rota-db';

vi.mock('@/lib/prisma', async () => ({
  prisma: (await import('../rota/fake-rota-db')).fakeRotaDb.client,
}));
vi.mock('@/components/auth/session', () => ({
  revokeAllSessions: vi.fn(async () => 1),
  getSessionUser: vi.fn(async () => null),
}));

type Reply = { error?: string; status?: string; swap?: { id: string }; swaps?: unknown[] };

function signInAs(userId: string): void {
  const email = `${userId}@cafe.test`;
  vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email, name: null });
}

function post(path: string, body: unknown): Request {
  return new Request(`http://cafe.test${path}`, { method: 'POST', body: JSON.stringify(body) });
}

const ask = (shiftId: string, toMemberId = 'member_alex') =>
  askSwap(post('/api/swaps', { shiftId, toMemberId }));
const decideOn = (swapId: string, decision: string) =>
  decide(post(`/api/swaps/${swapId}`, { decision }), { params: Promise.resolve({ swapId }) });
const reply = async (response: Response) => (await response.json()) as Reply;

async function plan(day: string, memberId = 'member_sam', startTime = '08:00') {
  const result = await addShift({ memberId, day, startTime, endTime: '11:00' });
  if (!result.ok) throw new Error(result.message);
  return result.shift.id;
}

async function askAsSam(shiftId: string): Promise<string> {
  signInAs('sam');
  const response = await ask(shiftId);
  expect(response.status).toBe(201);
  return (await reply(response)).swap?.id ?? '';
}

const shiftOwner = (id: string) => fakeRotaDb.shifts.find((shift) => shift.id === id)?.memberId;
const swapStatus = (id: string) => fakeRotaDb.swapRequests.find((swap) => swap.id === id)?.status;

let thursday = '';

beforeEach(async () => {
  fakeRotaDb.reset();
  vi.useFakeTimers({ toFake: ['Date'] });
  // Tuesday 10 Nov 2026, 12:00 in London.
  vi.setSystemTime(new Date('2026-11-10T12:00:00Z'));
  vi.stubEnv('CAFE_TIME_ZONE', 'Europe/London');
  vi.mocked(getSessionUser).mockResolvedValue(null);
  for (const id of ['boss', 'sam', 'alex', 'jo']) {
    fakeRotaDb.addUser({ id, email: `${id}@cafe.test`, createdAt: new Date('2026-01-01') });
  }
  fakeRotaDb.addMember({ userId: 'boss', name: 'Bea', role: 'manager' });
  fakeRotaDb.addMember({ userId: 'sam', name: 'Sam' });
  fakeRotaDb.addMember({ userId: 'alex', name: 'Alex' });
  fakeRotaDb.addMember({ userId: 'jo', name: 'Jo', removedAt: new Date('2026-10-01') });
  thursday = await plan('2026-11-12');
  await publishWeek('2026-11-09');
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('asking to swap', () => {
  it('lets staff ask for one of their own upcoming published shifts', async () => {
    const swapId = await askAsSam(thursday);
    expect(swapStatus(swapId)).toBe('waiting');
    expect(shiftOwner(thursday)).toBe('member_sam');
  });

  it("refuses someone else's shift, a past shift and an unpublished one", async () => {
    const alexShift = await plan('2026-11-13', 'member_alex');
    const pastShift = await plan('2026-11-09');
    const draftShift = await plan('2026-11-17');
    signInAs('sam');
    expect((await ask(alexShift, 'member_alex')).status).toBe(400);
    expect((await ask(pastShift)).status).toBe(400);
    expect((await ask(draftShift)).status).toBe(400);
    expect(fakeRotaDb.swapRequests).toHaveLength(0);
  });

  it('only names a current colleague on the staff', async () => {
    signInAs('sam');
    for (const colleague of ['member_sam', 'member_jo', 'member_boss', 'member_nobody']) {
      expect((await ask(thursday, colleague)).status).toBe(400);
    }
    expect(fakeRotaDb.swapRequests).toHaveLength(0);
  });

  it('allows one waiting request per shift', async () => {
    await askAsSam(thursday);
    expect((await ask(thursday)).status).toBe(409);
    expect(fakeRotaDb.swapRequests).toHaveLength(1);
  });

  it('is for staff only', async () => {
    expect((await ask(thursday)).status).toBe(401);
    signInAs('boss');
    expect((await ask(thursday)).status).toBe(403);
  });
});

describe('deciding', () => {
  it('approving gives the shift to the colleague', async () => {
    const swapId = await askAsSam(thursday);
    signInAs('boss');
    const response = await decideOn(swapId, 'approve');
    expect(response.status).toBe(200);
    expect(shiftOwner(thursday)).toBe('member_alex');
    expect(swapStatus(swapId)).toBe('approved');
  });

  it('turning down leaves the rota alone', async () => {
    const swapId = await askAsSam(thursday);
    signInAs('boss');
    expect((await decideOn(swapId, 'turn_down')).status).toBe(200);
    expect(shiftOwner(thursday)).toBe('member_sam');
    expect(swapStatus(swapId)).toBe('turned_down');
  });

  it('never decides the same request twice', async () => {
    const swapId = await askAsSam(thursday);
    signInAs('boss');
    await decideOn(swapId, 'turn_down');
    expect((await decideOn(swapId, 'approve')).status).toBe(409);
    expect((await decideOn(swapId, 'turn_down')).status).toBe(409);
    expect(shiftOwner(thursday)).toBe('member_sam');
    expect(swapStatus(swapId)).toBe('turned_down');
  });

  it('re-checks the shift and the colleague when approving', async () => {
    const swapId = await askAsSam(thursday);
    signInAs('boss');
    const shift = fakeRotaDb.shifts.find((row) => row.id === thursday);
    if (shift) shift.memberId = 'member_boss';
    const changed = await decideOn(swapId, 'approve');
    expect(changed.status).toBe(409);
    expect((await reply(changed)).error).toBe(SHIFT_CHANGED);
    if (shift) shift.memberId = 'member_sam';
    const alex = fakeDb.members.find((member) => member.id === 'member_alex');
    if (alex) alex.removedAt = new Date();
    expect((await decideOn(swapId, 'approve')).status).toBe(409);
    expect(shiftOwner(thursday)).toBe('member_sam');
    expect(swapStatus(swapId)).toBe('waiting');
  });

  it('is for the manager only', async () => {
    const swapId = await askAsSam(thursday);
    expect((await decideOn(swapId, 'approve')).status).toBe(403);
    signInAs('alex');
    expect((await decideOn(swapId, 'approve')).status).toBe(403);
    expect((await listSwaps()).status).toBe(403);
    expect(swapStatus(swapId)).toBe('waiting');
    expect(shiftOwner(thursday)).toBe('member_sam');
  });

  it('answers an unknown request with not found', async () => {
    signInAs('boss');
    expect((await decideOn('missing', 'approve')).status).toBe(404);
    expect((await decideOn('missing', 'turn_down')).status).toBe(404);
  });
});
