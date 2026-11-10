// Calendar-date helpers. Every date on the site is a plain "YYYY-MM-DD"
// string, so nothing here depends on the time zone of the machine that
// runs it, except todayIn(), which asks what the date is in a named zone.

export type IsoDate = string;

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== "string") return false;
  const m = ISO.exec(value);
  if (!m) return false;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(t).toISOString().slice(0, 10) === value;
}

/** Whole days since 1970-01-01. */
export function dayNumber(date: IsoDate): number {
  const m = ISO.exec(date);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${date}`);
  return Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY_MS);
}

export function fromDayNumber(n: number): IsoDate {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return fromDayNumber(dayNumber(date) + days);
}

/** Days from a to b; positive when b is later. */
export function daysBetween(a: IsoDate, b: IsoDate): number {
  return dayNumber(b) - dayNumber(a);
}

/** 0 is Sunday, 6 is Saturday. */
export function weekday(date: IsoDate): number {
  return (((dayNumber(date) + 4) % 7) + 7) % 7; // 1970-01-01 was a Thursday
}

/** The Monday that starts the week containing this date. */
export function mondayOf(date: IsoDate): IsoDate {
  return addDays(date, -((weekday(date) + 6) % 7));
}

function parts(date: IsoDate) {
  const m = ISO.exec(date);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${date}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function weekdayName(date: IsoDate): string {
  return WEEKDAYS[weekday(date)]!;
}

/** "January 12" */
export function formatMonthDay(date: IsoDate): string {
  const p = parts(date);
  return `${MONTHS[p.month - 1]} ${p.day}`;
}

/** "Tuesday, January 12" */
export function formatLong(date: IsoDate): string {
  return `${weekdayName(date)}, ${formatMonthDay(date)}`;
}

/** "Tuesday, January 12, 2027" */
export function formatFull(date: IsoDate): string {
  return `${formatLong(date)}, ${parts(date).year}`;
}

/** "Tue Jan 12" */
export function formatShort(date: IsoDate): string {
  const p = parts(date);
  return `${weekdayName(date).slice(0, 3)} ${MONTHS[p.month - 1]!.slice(0, 3)} ${p.day}`;
}

/** "March 8–12", or "March 29 – April 4" across months. */
export function formatRange(start: IsoDate, end: IsoDate): string {
  if (start === end) return formatMonthDay(start);
  const a = parts(start);
  const b = parts(end);
  if (a.month === b.month && a.year === b.year) return `${MONTHS[a.month - 1]} ${a.day}–${b.day}`;
  return `${formatMonthDay(start)} – ${formatMonthDay(end)}`;
}

/** "21:00" becomes "9 p.m."; "09:30" becomes "9:30 a.m." */
export function formatTime(time: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!m) return time;
  const h = Number(m[1]);
  const min = m[2];
  const suffix = h >= 12 ? "p.m." : "a.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === "00" ? `${h12} ${suffix}` : `${h12}:${min} ${suffix}`;
}

/** Today's date in the given IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const got: Record<string, string> = {};
  for (const part of fmt.formatToParts(now)) got[part.type] = part.value;
  return `${got.year}-${got.month}-${got.day}`;
}

/** Reads ?date=YYYY-MM-DD from a query string. Null when absent or not a real date. */
export function dateFromQuery(search: string): IsoDate | null {
  const value = new URLSearchParams(search).get("date");
  return isIsoDate(value) ? value : null;
}
