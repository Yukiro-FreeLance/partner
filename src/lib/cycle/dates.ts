const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string) {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  return utc.getUTCFullYear() === year && utc.getUTCMonth() === month - 1 && utc.getUTCDate() === day;
}

export function addDays(iso: string, days: number) {
  if (!isIsoDate(iso)) throw new Error("Invalid date");
  const [year, month, day] = iso.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function diffDays(later: string, earlier: string) {
  if (!isIsoDate(later) || !isIsoDate(earlier)) throw new Error("Invalid date");
  const [laterYear, laterMonth, laterDay] = later.split("-").map(Number);
  const [earlierYear, earlierMonth, earlierDay] = earlier.split("-").map(Number);
  const ms = Date.UTC(laterYear, laterMonth - 1, laterDay) - Date.UTC(earlierYear, earlierMonth - 1, earlierDay);
  return Math.round(ms / 86_400_000);
}

export function compareDates(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeTimeZone(value: string) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 64) return null;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return null;
  }
}

function partsInZone(now: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return null;
  }
}

export function calendarDay(timeZone: string, now = new Date()) {
  const parts = partsInZone(now, normalizeTimeZone(timeZone) ?? "UTC");
  const year = parts?.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts?.find((part) => part.type === "month")?.value ?? "01";
  const day = parts?.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

export function hourInZone(timeZone: string, now = new Date()) {
  const parts = partsInZone(now, normalizeTimeZone(timeZone) ?? "UTC");
  const hour = Number(parts?.find((part) => part.type === "hour")?.value ?? "0");
  return hour === 24 ? 0 : hour;
}

export function formatDay(iso: string) {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatDayShort(iso: string) {
  if (!isIsoDate(iso)) return iso;
  const [year, month, day] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function weekdayIndex(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function weekDays(cursor: string) {
  const monday = addDays(cursor, -((weekdayIndex(cursor) + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function monthGrid(cursor: string) {
  const start = `${cursor.slice(0, 7)}-01`;
  if (!isIsoDate(start)) throw new Error("Invalid month");
  const [year, month] = start.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lead = (weekdayIndex(start) + 6) % 7;
  const cells: { day: string; inMonth: boolean }[] = [];
  for (let index = lead; index > 0; index -= 1) cells.push({ day: addDays(start, -index), inMonth: false });
  for (let day = 0; day < daysInMonth; day += 1) cells.push({ day: addDays(start, day), inMonth: true });
  let last = cells[cells.length - 1]?.day ?? start;
  while (cells.length % 7 !== 0) {
    last = addDays(last, 1);
    cells.push({ day: last, inMonth: false });
  }
  const label = new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)));
  return { start, label, cells };
}

export function eachDay(start: string, end: string) {
  if (compareDates(end, start) < 0) return [];
  const days: string[] = [];
  let cursor = start;
  while (compareDates(cursor, end) <= 0 && days.length < 400) {
    days.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return days;
}
