const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function dayNameToIndex(day: string): number {
  const index = DAY_NAMES.indexOf(day);
  return index >= 0 ? index : 0;
}

export function indexToDayName(index: number): string {
  return DAY_NAMES[index] ?? "Sunday";
}

function padTime(hours: number, minutes: number): string {
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

/** Normalize 12h or 24h clock strings to HH:MM:SS. Returns null when invalid. */
export function parseClockTo24(input: string): string | null {
  if (!input) return null;
  const raw = input.replace(/[\u00A0\u202F\u2009]/g, " ").trim();
  if (!raw) return null;

  const ampm = raw.match(/^(\d{1,2})(?::(\d{2}))(?::\d{2})?\s*([AP]M)$/i);
  if (ampm) {
    let hours = Number(ampm[1]);
    const minutes = Number(ampm[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) return null;
    const period = ampm[3].toUpperCase();
    if (period === "PM" && hours !== 12) hours += 12;
    if (period === "AM" && hours === 12) hours = 0;
    return padTime(hours, minutes);
  }

  const h24 = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (h24) {
    const hours = Number(h24[1]);
    const minutes = Number(h24[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return padTime(hours, minutes);
  }

  return null;
}

export function time12To24(time12: string): string {
  const parsed = parseClockTo24(time12);
  if (!parsed) {
    throw new Error(`Invalid time "${time12}". Use a time like 9:00 AM or 14:30.`);
  }
  return parsed;
}

export function time24To12(time24: string): string {
  const parsed = parseClockTo24(time24) ?? time24;
  const [hoursStr, minutesStr] = parsed.split(":");
  let hours = parseInt(hoursStr, 10);
  if (Number.isNaN(hours)) return time24;
  const minutes = minutesStr?.slice(0, 2) ?? "00";
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${period}`;
}

export function formatSlotRange(startTime: string, endTime: string): string {
  return `${time24To12(startTime)} - ${time24To12(endTime)}`;
}

export function parseSlotRangeLabel(slot: string): { start: string; end: string } {
  const parts = slot
    .split(/\s*[-–—]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length !== 2) {
    throw new Error(`Invalid slot "${slot}". Each slot needs a start and end time.`);
  }
  const start = parseClockTo24(parts[0]);
  const end = parseClockTo24(parts[1]);
  if (!start || !end) {
    throw new Error(`Invalid slot times in "${slot}".`);
  }
  if (start >= end) {
    throw new Error(`End time must be after start time (${slot}).`);
  }
  return { start, end };
}

export function weeklyScheduleToSlotRows(
  schedule: Array<{ day: string; slots: string[]; isActive: boolean }>,
  slotDurationMinutes = 30,
) {
  const rows: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
    slot_duration_minutes: number;
    is_active: boolean;
  }> = [];
  const seen = new Set<string>();

  for (const daySchedule of schedule) {
    if (!daySchedule.isActive) continue;
    const dayOfWeek = dayNameToIndex(daySchedule.day);
    for (const slot of daySchedule.slots) {
      const { start, end } = parseSlotRangeLabel(slot);
      const key = `${dayOfWeek}|${start}|${end}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        day_of_week: dayOfWeek,
        start_time: start,
        end_time: end,
        slot_duration_minutes: slotDurationMinutes,
        is_active: true,
      });
    }
  }

  return rows;
}
