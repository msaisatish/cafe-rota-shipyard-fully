import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  cafeTimeZone,
  daysOfWeek,
  formatDay,
  formatTime,
  formatWeekLabel,
  isLocalDate,
  isMonday,
  localToUtc,
  weekStartOf,
} from '@/lib/cafe-time/time';

beforeEach(() => {
  vi.stubEnv('CAFE_TIME_ZONE', 'Europe/London');
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('the café time zone', () => {
  it('is London when nothing is set or the setting is not a real zone', () => {
    vi.stubEnv('CAFE_TIME_ZONE', '');
    expect(cafeTimeZone()).toBe('Europe/London');
    vi.stubEnv('CAFE_TIME_ZONE', 'Not/AZone');
    expect(cafeTimeZone()).toBe('Europe/London');
  });

  it('follows the setting', () => {
    vi.stubEnv('CAFE_TIME_ZONE', 'America/New_York');
    expect(cafeTimeZone()).toBe('America/New_York');
  });
});

describe('weeks', () => {
  it('start on the Monday, café time', () => {
    expect(weekStartOf(new Date('2026-11-11T12:00:00Z'))).toBe('2026-11-09');
    expect(weekStartOf(new Date('2026-11-09T00:00:00Z'))).toBe('2026-11-09');
    expect(weekStartOf(new Date('2026-11-15T23:59:00Z'))).toBe('2026-11-09');
  });

  it('use the café clock, not UTC, near midnight', () => {
    // 23:30 UTC on Sunday 31 May is 00:30 on Monday 1 June in London (summer time).
    expect(weekStartOf(new Date('2026-05-31T23:30:00Z'))).toBe('2026-06-01');
  });

  it('list seven days, Monday to Sunday, across a month end', () => {
    expect(daysOfWeek('2026-11-30')).toEqual([
      '2026-11-30',
      '2026-12-01',
      '2026-12-02',
      '2026-12-03',
      '2026-12-04',
      '2026-12-05',
      '2026-12-06',
    ]);
  });

  it('are named by a real Monday only', () => {
    expect(isMonday('2026-11-09')).toBe(true);
    expect(isMonday('2026-11-10')).toBe(false);
    expect(isMonday('2026-02-30')).toBe(false);
    expect(isLocalDate('2026-13-01')).toBe(false);
  });
});

describe('turning café times into instants', () => {
  it('uses winter time (UTC) in November', () => {
    expect(localToUtc('2026-11-10', '08:00').toISOString()).toBe('2026-11-10T08:00:00.000Z');
  });

  it('uses summer time (UTC+1) in July', () => {
    expect(localToUtc('2026-07-14', '08:00').toISOString()).toBe('2026-07-14T07:00:00.000Z');
  });

  it('gets both sides of the spring clock change right (29 March 2026)', () => {
    expect(localToUtc('2026-03-29', '00:30').toISOString()).toBe('2026-03-29T00:30:00.000Z');
    expect(localToUtc('2026-03-29', '08:00').toISOString()).toBe('2026-03-29T07:00:00.000Z');
    expect(localToUtc('2026-03-28', '08:00').toISOString()).toBe('2026-03-28T08:00:00.000Z');
  });

  it('gets both sides of the autumn clock change right (25 October 2026)', () => {
    expect(localToUtc('2026-10-25', '00:30').toISOString()).toBe('2026-10-24T23:30:00.000Z');
    expect(localToUtc('2026-10-25', '08:00').toISOString()).toBe('2026-10-25T08:00:00.000Z');
    expect(localToUtc('2026-10-24', '08:00').toISOString()).toBe('2026-10-24T07:00:00.000Z');
  });

  it('keeps every shift of a clock-change week at its café time', () => {
    for (const day of daysOfWeek('2026-10-19').concat(daysOfWeek('2026-10-26'))) {
      const start = localToUtc(day, '08:00');
      expect(formatTime(start)).toBe('08:00');
      expect(weekStartOf(start)).toBe(day < '2026-10-26' ? '2026-10-19' : '2026-10-26');
    }
  });

  it('works for another zone', () => {
    vi.stubEnv('CAFE_TIME_ZONE', 'America/New_York');
    expect(localToUtc('2026-11-10', '08:00').toISOString()).toBe('2026-11-10T13:00:00.000Z');
    expect(formatTime(new Date('2026-11-10T13:00:00Z'))).toBe('08:00');
  });
});

describe('wording', () => {
  it('names days and weeks the way the screens say them', () => {
    expect(formatWeekLabel('2026-11-09')).toBe('Week of Monday 9 Nov');
    expect(formatDay('2026-11-10')).toBe('Tuesday 10 Nov');
    expect(formatDay(new Date('2026-10-24T23:30:00Z'))).toBe('Sunday 25 Oct');
    expect(formatTime(new Date('2026-07-14T13:00:00Z'))).toBe('14:00');
  });
});
