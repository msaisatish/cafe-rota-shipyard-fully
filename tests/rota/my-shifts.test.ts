import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { groupMyShifts } from '@/lib/rota/my-shifts';
import { addShift, publishWeek, upcomingPublishedShiftsFor } from '@/lib/rota/service';
import { fakeRotaDb } from './fake-rota-db';

vi.mock('@/lib/prisma', async () => ({
  prisma: (await import('./fake-rota-db')).fakeRotaDb.client,
}));

// Tuesday 10 Nov 2026, 12:00 in London (GMT, so the same in UTC).
const now = new Date('2026-11-10T12:00:00Z');

async function plan(memberId: string, day: string, startTime = '08:00', endTime = '11:00') {
  const result = await addShift({ memberId, day, startTime, endTime });
  if (!result.ok) throw new Error(result.message);
}

const days = (memberId: string) =>
  upcomingPublishedShiftsFor(memberId, now).then((shifts) => shifts.map((shift) => shift.day));

beforeEach(() => {
  fakeRotaDb.reset();
  vi.stubEnv('CAFE_TIME_ZONE', 'Europe/London');
  for (const id of ['sam', 'alex']) {
    fakeRotaDb.addUser({ id, email: `${id}@cafe.test`, createdAt: new Date('2026-01-01') });
    fakeRotaDb.addMember({ userId: id, name: id });
  }
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('My shifts lists only what this person should see', () => {
  it('shows only their own shifts', async () => {
    await plan('member_sam', '2026-11-12');
    await plan('member_alex', '2026-11-11');
    await publishWeek('2026-11-09');

    expect(await days('member_sam')).toEqual(['Thursday 12 Nov']);
    expect(await days('member_alex')).toEqual(['Wednesday 11 Nov']);
  });

  it('hides shifts in a week the manager has not published', async () => {
    await plan('member_sam', '2026-11-12');
    await plan('member_sam', '2026-11-17');
    await publishWeek('2026-11-09');

    expect(await days('member_sam')).toEqual(['Thursday 12 Nov']);
  });

  it('shows nothing before any week is published', async () => {
    await plan('member_sam', '2026-11-12');

    expect(await upcomingPublishedShiftsFor('member_sam', now)).toEqual([]);
  });

  it('leaves out shifts that are over but keeps one still going', async () => {
    await plan('member_sam', '2026-11-09');
    await plan('member_sam', '2026-11-10', '06:00', '09:00');
    await plan('member_sam', '2026-11-10', '10:00', '16:00');
    await publishWeek('2026-11-09');

    const shifts = await upcomingPublishedShiftsFor('member_sam', now);
    expect(shifts.map((shift) => `${shift.day} ${shift.start}`)).toEqual(['Tuesday 10 Nov 10:00']);
  });

  it('lists them soonest first, in café time', async () => {
    await plan('member_sam', '2026-11-26', '14:00', '18:00');
    await plan('member_sam', '2026-11-12', '09:30', '15:00');
    await plan('member_sam', '2026-11-24');
    await publishWeek('2026-11-09');
    await publishWeek('2026-11-23');

    const shifts = await upcomingPublishedShiftsFor('member_sam', now);
    expect(shifts.map((shift) => [shift.day, shift.start, shift.end, shift.weekStart])).toEqual([
      ['Thursday 12 Nov', '09:30', '15:00', '2026-11-09'],
      ['Tuesday 24 Nov', '08:00', '11:00', '2026-11-23'],
      ['Thursday 26 Nov', '14:00', '18:00', '2026-11-23'],
    ]);
  });
});

describe('the screen puts the next shift first, then the rest by week', () => {
  it('splits off the next shift and groups the others under week headings', async () => {
    await plan('member_sam', '2026-11-12');
    await plan('member_sam', '2026-11-13');
    await plan('member_sam', '2026-11-24');
    await publishWeek('2026-11-09');
    await publishWeek('2026-11-23');

    const view = groupMyShifts(await upcomingPublishedShiftsFor('member_sam', now));
    expect(view.next?.day).toBe('Thursday 12 Nov');
    expect(view.later.map((week) => [week.label, week.shifts.map((shift) => shift.day)])).toEqual([
      ['Week of 9 Nov', ['Friday 13 Nov']],
      ['Week of 23 Nov', ['Tuesday 24 Nov']],
    ]);
  });

  it('has no next shift and no weeks when there is nothing to show', () => {
    expect(groupMyShifts([])).toEqual({ next: null, later: [] });
  });
});
