export const DAILY_TIME_ZONE = process.env.DAILY_RESET_TIMEZONE || "Asia/Manila";

type ZonedParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

export function zonedParts(date: Date, timeZone = DAILY_TIME_ZONE): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: read("year"), month: read("month"), day: read("day"), hour: read("hour"), minute: read("minute"), second: read("second") };
}

export function dayKey(date: Date, timeZone = DAILY_TIME_ZONE) {
  const parts = zonedParts(date, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function previousDayKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function nextDailyReset(now: Date, timeZone = DAILY_TIME_ZONE) {
  const today = dayKey(now, timeZone);
  let low = now.getTime();
  let high = now.getTime() + 36 * 60 * 60 * 1000;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (dayKey(new Date(mid), timeZone) === today) low = mid;
    else high = mid;
  }
  return new Date(high);
}

export function formatResetLabel(resetAt: Date, timeZone = DAILY_TIME_ZONE) {
  const when = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(resetAt);
  return when;
}
