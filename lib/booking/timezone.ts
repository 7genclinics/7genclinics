/** Clinic timezone — all bookable slots are expressed in Pakistan Standard Time. */
export const CLINIC_TIMEZONE = "Asia/Karachi";

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Calendar date (YYYY-MM-DD) for an instant in the clinic timezone. */
export function getPkDateKey(instant: string | Date = new Date()): string {
  const value = typeof instant === "string" ? new Date(instant) : instant;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

/** Split a stored UTC ISO timestamp into clinic-local date + HH:MM. */
export function pkPartsFromIso(iso: string): { date: string; time: string } {
  const value = new Date(iso);
  const date = getPkDateKey(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return {
    date,
    time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

/** Day-of-week (0=Sun … 6=Sat) for a calendar date in clinic timezone. */
export function getPkDayOfWeek(date: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: CLINIC_TIMEZONE,
    weekday: "short",
  }).format(new Date(`${date}T12:00:00+05:00`));

  return WEEKDAY_MAP[weekday] ?? 0;
}

/** Convert a clinic-local date + HH:MM time to a UTC ISO string for storage. */
export function pkDateTimeToUtcIso(date: string, time: string): string {
  return new Date(`${date}T${time}:00+05:00`).toISOString();
}

/** Format a YYYY-MM-DD clinic calendar date for display (no UTC day shift). */
export function formatPkCalendarDate(
  dateStr: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const value = new Date(`${dateStr}T12:00:00+05:00`);
  return value.toLocaleDateString("en-US", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  });
}
