import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatSlotRange,
  parseClockTo24,
  parseSlotRangeLabel,
  time12To24,
  weeklyScheduleToSlotRows,
} from "./schedule-time.ts";

describe("parseClockTo24", () => {
  it("parses 12-hour labels with or without a leading zero", () => {
    assert.equal(parseClockTo24("9:00 AM"), "09:00:00");
    assert.equal(parseClockTo24("09:00 AM"), "09:00:00");
    assert.equal(parseClockTo24("2:00 PM"), "14:00:00");
    assert.equal(parseClockTo24("12:00 AM"), "00:00:00");
    assert.equal(parseClockTo24("12:30 PM"), "12:30:00");
  });

  it("parses 24-hour HTML time inputs", () => {
    assert.equal(parseClockTo24("17:00"), "17:00:00");
    assert.equal(parseClockTo24("09:30:00"), "09:30:00");
  });

  it("accepts unicode spaces between time and AM/PM", () => {
    assert.equal(parseClockTo24("9:00\u00A0AM"), "09:00:00");
  });
});

describe("parseSlotRangeLabel", () => {
  it("splits hyphen and en-dash ranges", () => {
    assert.deepEqual(parseSlotRangeLabel("09:00 AM - 09:30 AM"), {
      start: "09:00:00",
      end: "09:30:00",
    });
    assert.deepEqual(parseSlotRangeLabel("9:00 AM – 9:30 AM"), {
      start: "09:00:00",
      end: "09:30:00",
    });
  });

  it("rejects end times that are not after start", () => {
    assert.throws(() => parseSlotRangeLabel("5:00 PM - 5:00 PM"));
    assert.throws(() => parseSlotRangeLabel("5:30 PM - 5:00 PM"));
  });
});

describe("weeklyScheduleToSlotRows", () => {
  it("maps weekday names to Postgres DOW and skips inactive days", () => {
    const rows = weeklyScheduleToSlotRows(
      [
        { day: "Monday", isActive: true, slots: ["09:00 AM - 09:30 AM", "2:00 PM - 2:30 PM"] },
        { day: "Sunday", isActive: false, slots: ["10:00 AM - 10:30 AM"] },
      ],
      30,
    );
    assert.deepEqual(rows, [
      {
        day_of_week: 1,
        start_time: "09:00:00",
        end_time: "09:30:00",
        slot_duration_minutes: 30,
        is_active: true,
      },
      {
        day_of_week: 1,
        start_time: "14:00:00",
        end_time: "14:30:00",
        slot_duration_minutes: 30,
        is_active: true,
      },
    ]);
  });

  it("deduplicates equivalent 12-hour labels", () => {
    const rows = weeklyScheduleToSlotRows(
      [
        {
          day: "Monday",
          isActive: true,
          slots: ["09:00 AM - 09:30 AM", "9:00 AM - 9:30 AM"],
        },
      ],
      30,
    );
    assert.equal(rows.length, 1);
  });
});

describe("time12To24", () => {
  it("throws instead of silently rewriting invalid times", () => {
    assert.throws(() => time12To24("not-a-time"));
    assert.equal(formatSlotRange("09:00:00", "09:30:00"), "9:00 AM - 9:30 AM");
  });
});
