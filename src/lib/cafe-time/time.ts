/**
 * Café time. Shifts are stored as UTC instants and shown in the café's own
 * time zone, so 08:00 stays 08:00 on both sides of a clock change. Dates are
 * café-local "YYYY-MM-DD" strings; a week is named by its Monday. Intl only:
 * this file runs in the browser as well as on the server.
 */

const DEFAULT_TIME_ZONE = 'Europe/London';
const DAY_MS = 24 * 60 * 60 * 1000;
const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

function isKnownTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** The café's time zone, from `CAFE_TIME_ZONE`; London when unset or unknown. */
export function cafeTimeZone(): string {
  const configured = process.env.CAFE_TIME_ZONE?.trim();
  return configured && isKnownTimeZone(configured) ? configured : DEFAULT_TIME_ZONE;
}

function localParts(instant: Date, zone: string): LocalParts {
  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = Object.fromEntries(
    format.formatToParts(instant).map((part) => [part.type, Number(part.value)]),
  );
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 0,
    day: parts.day ?? 0,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
  };
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function dateFromUtcDay(utcMs: number): string {
  const day = new Date(utcMs);
  return `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`;
}

/** Midnight UTC of a local date, used only for calendar arithmetic. */
function utcDayOf(date: string): number {
  const match = LOCAL_DATE.exec(date);
  if (!match) throw new Error(`Not a date: ${date}`);
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** True for a real calendar date written "YYYY-MM-DD". */
export function isLocalDate(value: string): boolean {
  return LOCAL_DATE.test(value) && dateFromUtcDay(utcDayOf(value)) === value;
}

/** True for a time of day written "HH:MM", 00:00 to 23:59. */
export function isLocalTime(value: string): boolean {
  return LOCAL_TIME.test(value);
}

/** True when the date is a Monday, the day a rota week is named by. */
export function isMonday(date: string): boolean {
  return isLocalDate(date) && new Date(utcDayOf(date)).getUTCDay() === 1;
}

/** The date `days` after (or before) a local date. */
export function addDays(date: string, days: number): string {
  return dateFromUtcDay(utcDayOf(date) + days * DAY_MS);
}

/** The Monday of the week a local date falls in. */
export function mondayOf(date: string): string {
  const weekday = new Date(utcDayOf(date)).getUTCDay();
  return addDays(date, -((weekday + 6) % 7));
}

/** The café-local date of an instant. */
export function localDateOf(instant: Date): string {
  const parts = localParts(instant, cafeTimeZone());
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** The Monday, café time, of the week an instant falls in. */
export function weekStartOf(instant: Date): string {
  return mondayOf(localDateOf(instant));
}

/** The seven local dates of a week, Monday first. */
export function daysOfWeek(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** How far the café's clock is ahead of UTC at an instant, in milliseconds. */
function offsetAt(instant: number, zone: string): number {
  const parts = localParts(new Date(instant), zone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  return asUtc - Math.floor(instant / 60000) * 60000;
}

/**
 * The UTC instant of a café-local date and "HH:MM". The offset is read twice
 * because the first guess can land on the other side of a clock change.
 */
export function localToUtc(date: string, time: string): Date {
  const match = LOCAL_TIME.exec(time);
  if (!match) throw new Error(`Not a time: ${time}`);
  const zone = cafeTimeZone();
  const wallClock = utcDayOf(date) + (Number(match[1]) * 60 + Number(match[2])) * 60000;
  const firstGuess = wallClock - offsetAt(wallClock, zone);
  return new Date(wallClock - offsetAt(firstGuess, zone));
}

/** "08:00", café time. */
export function formatTime(instant: Date): string {
  const parts = localParts(instant, cafeTimeZone());
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

/** "Tuesday", for a local date. */
export function formatWeekday(date: string): string {
  return WEEKDAYS[new Date(utcDayOf(date)).getUTCDay()] ?? '';
}

/** "11 Nov", for a local date. */
export function formatDayMonth(date: string): string {
  const day = new Date(utcDayOf(date));
  return `${day.getUTCDate()} ${MONTHS[day.getUTCMonth()] ?? ''}`;
}

/** "Tuesday 12 Nov", for a local date or an instant (café time). */
export function formatDay(day: Date | string): string {
  const date = typeof day === 'string' ? day : localDateOf(day);
  return `${formatWeekday(date)} ${formatDayMonth(date)}`;
}

/** "Week of Monday 11 Nov". */
export function formatWeekLabel(weekStart: string): string {
  return `Week of ${formatDay(weekStart)}`;
}
