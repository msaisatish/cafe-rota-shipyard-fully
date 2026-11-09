import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getSessionUser } from '@/components/auth/session';
import { GET } from '@/app/api/week/route';
import { POST as publish } from '@/app/api/week/publish/route';
import { POST as addShift } from '@/app/api/shifts/route';
import { DELETE as removeShift } from '@/app/api/shifts/[shiftId]/route';
import { fakeRotaDb } from './fake-rota-db';

vi.mock('@/lib/prisma', async () => ({
  prisma: (await import('./fake-rota-db')).fakeRotaDb.client,
}));
vi.mock('@/components/auth/session', () => ({
  revokeAllSessions: vi.fn(async () => 1),
  getSessionUser: vi.fn(async () => null),
}));

type Reply = { error?: string; fieldErrors?: Record<string, string>; weekStart?: string };

function signInAs(userId: string): void {
  const email = `${userId}@cafe.test`;
  vi.mocked(getSessionUser).mockResolvedValue({ id: userId, email, name: null });
}

function post(path: string, body: unknown): Request {
  return new Request(`http://cafe.test${path}`, { method: 'POST', body: JSON.stringify(body) });
}

const add = (body: Record<string, unknown>) => addShift(post('/api/shifts', body));
const publishWeek = (weekStart: string) => publish(post('/api/week/publish', { weekStart }));
const viewWeek = (week: string) => GET(new Request(`http://cafe.test/api/week?week=${week}`));
const remove = (shiftId: string) =>
  removeShift(new Request(`http://cafe.test/api/shifts/${shiftId}`, { method: 'DELETE' }), {
    params: Promise.resolve({ shiftId }),
  });

const tuesday = { day: '2026-11-10', startTime: '08:00', endTime: '14:00', memberId: 'member_sam' };

beforeEach(() => {
  fakeRotaDb.reset();
  vi.stubEnv('CAFE_TIME_ZONE', 'Europe/London');
  vi.mocked(getSessionUser).mockResolvedValue(null);
  for (const id of ['boss', 'sam', 'jo']) {
    fakeRotaDb.addUser({ id, email: `${id}@cafe.test`, createdAt: new Date('2026-01-01') });
  }
  fakeRotaDb.addMember({ userId: 'boss', name: 'Bea', role: 'manager' });
  fakeRotaDb.addMember({ userId: 'sam', name: 'Sam' });
  fakeRotaDb.addMember({ userId: 'jo', name: 'Jo', removedAt: new Date('2026-10-01') });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('only the manager plans the week', () => {
  it('turns away a visitor who is not signed in', async () => {
    expect((await viewWeek('2026-11-09')).status).toBe(401);
    expect((await add(tuesday)).status).toBe(401);
    expect((await publishWeek('2026-11-09')).status).toBe(401);
    expect((await remove('row_1')).status).toBe(401);
  });

  it('refuses a member of staff', async () => {
    signInAs('boss');
    const shiftId = ((await (await add(tuesday)).json()) as { shift: { id: string } }).shift.id;
    signInAs('sam');
    expect((await viewWeek('2026-11-09')).status).toBe(403);
    expect((await add(tuesday)).status).toBe(403);
    expect((await publishWeek('2026-11-09')).status).toBe(403);
    expect((await remove(shiftId)).status).toBe(403);
    expect(fakeRotaDb.shifts).toHaveLength(1);
    expect(fakeRotaDb.weeks[0]?.publishedAt).toBeNull();
  });
});

describe('adding a shift', () => {
  beforeEach(() => signInAs('boss'));

  it('starts the week as a draft and stores the times in UTC', async () => {
    const response = await add(tuesday);
    expect(response.status).toBe(201);
    expect(((await response.json()) as Reply).weekStart).toBe('2026-11-09');
    expect(fakeRotaDb.weeks).toEqual([
      expect.objectContaining({ weekStart: '2026-11-09', publishedAt: null }),
    ]);
    expect(fakeRotaDb.shifts[0]).toMatchObject({
      memberId: 'member_sam',
      startsAt: new Date('2026-11-10T08:00:00Z'),
      endsAt: new Date('2026-11-10T14:00:00Z'),
    });
  });

  it('keeps café time across the autumn clock change', async () => {
    await add({ ...tuesday, day: '2026-10-24' });
    await add({ ...tuesday, day: '2026-10-25' });
    const [saturday, sunday] = fakeRotaDb.shifts;
    expect(saturday?.startsAt).toEqual(new Date('2026-10-24T07:00:00Z'));
    expect(sunday?.startsAt).toEqual(new Date('2026-10-25T08:00:00Z'));
    expect(fakeRotaDb.weeks).toHaveLength(1);
  });

  it('refuses an end time that is not after the start time', async () => {
    for (const endTime of ['08:00', '07:30']) {
      const response = await add({ ...tuesday, endTime });
      expect(response.status).toBe(400);
      const reply = (await response.json()) as Reply;
      expect(reply.fieldErrors?.endTime).toBe('The end time must be after the start time.');
    }
    expect(fakeRotaDb.shifts).toHaveLength(0);
  });

  it('asks who is working when nobody was chosen', async () => {
    const reply = (await (await add({ ...tuesday, memberId: '' })).json()) as Reply;
    expect(reply.fieldErrors?.memberId).toBe('Choose who is working.');
  });

  it('only puts current staff on a shift, never the manager or someone who left', async () => {
    for (const memberId of ['member_boss', 'member_jo', 'member_nobody']) {
      const response = await add({ ...tuesday, memberId });
      expect(response.status).toBe(400);
      expect(((await response.json()) as Reply).fieldErrors?.memberId).toMatch(/staff list/);
    }
    expect(fakeRotaDb.shifts).toHaveLength(0);
    expect(fakeRotaDb.weeks).toHaveLength(0);
  });
});

describe('publishing and removing', () => {
  beforeEach(() => signInAs('boss'));

  it('will not publish a week with no shifts', async () => {
    const response = await publishWeek('2026-11-09');
    expect(response.status).toBe(400);
    expect(((await response.json()) as Reply).error).toBe(
      'Add a shift before publishing this week.',
    );
  });

  it('refuses a week that does not start on a Monday', async () => {
    expect((await publishWeek('2026-11-10')).status).toBe(400);
    expect((await viewWeek('2026-11-10')).status).toBe(400);
  });

  it('publishes a planned week, and the manager can still change it', async () => {
    await add(tuesday);
    expect((await publishWeek('2026-11-09')).status).toBe(200);
    expect(fakeRotaDb.weeks[0]?.publishedAt).toBeInstanceOf(Date);
    expect((await add({ ...tuesday, day: '2026-11-11' })).status).toBe(201);
    const shiftId = String(fakeRotaDb.shifts[0]?.id);
    expect((await remove(shiftId)).status).toBe(200);
    expect((await remove(shiftId)).status).toBe(404);
    expect(fakeRotaDb.shifts).toHaveLength(1);
  });
});

describe("the manager's view of a week", () => {
  beforeEach(() => signInAs('boss'));

  it('lists shifts by day then start, marks leavers, and offers only current staff', async () => {
    await add({ ...tuesday, day: '2026-11-11', startTime: '07:00', endTime: '12:00' });
    await add({ ...tuesday, startTime: '12:00', endTime: '17:00' });
    await add(tuesday);
    const members = fakeRotaDb.client.cafeMember;
    await members.update({ where: { id: 'member_sam' }, data: { removedAt: new Date() } });

    const { week } = (await (await viewWeek('2026-11-09')).json()) as {
      week: {
        label: string;
        isPublished: boolean;
        shifts: Record<string, string>[];
        staff: unknown[];
      };
    };
    expect(week.label).toBe('Week of Monday 9 Nov');
    expect(week.isPublished).toBe(false);
    expect(week.shifts.map((shift) => `${shift.day} ${shift.start}`)).toEqual([
      'Tuesday 10 Nov 08:00',
      'Tuesday 10 Nov 12:00',
      'Wednesday 11 Nov 07:00',
    ]);
    expect(week.shifts[0]?.who).toBe('Sam (left)');
    expect(week.staff).toEqual([]);
  });

  it('shows an empty week without making a row for it', async () => {
    const { week } = (await (await viewWeek('2026-11-16')).json()) as {
      week: { shifts: unknown[]; staff: { name: string }[] };
    };
    expect(week.shifts).toEqual([]);
    expect(week.staff.map((person) => person.name)).toEqual(['Sam']);
    expect(fakeRotaDb.weeks).toHaveLength(0);
  });
});
