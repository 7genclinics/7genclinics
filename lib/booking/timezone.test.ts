import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPkCalendarDate,
  getPkDateKey,
  getPkDayOfWeek,
  pkDateTimeToUtcIso,
  pkPartsFromIso,
} from "./timezone.ts";

describe("timezone helpers", () => {
  it("converts clinic-local date/time to UTC ISO", () => {
    assert.equal(
      pkDateTimeToUtcIso("2026-07-14", "10:00"),
      "2026-07-14T05:00:00.000Z",
    );
  });

  it("resolves day-of-week in Asia/Karachi", () => {
    // 2026-07-13 is a Monday in Pakistan.
    assert.equal(getPkDayOfWeek("2026-07-13"), 1);
  });

  it("keeps appointment date keys in Asia/Karachi, not the browser zone", () => {
    // 14:30 Pakistan = 09:30 UTC same calendar day.
    assert.equal(getPkDateKey("2026-09-08T09:30:00.000Z"), "2026-09-08");
    assert.deepEqual(pkPartsFromIso("2026-09-08T09:30:00.000Z"), {
      date: "2026-09-08",
      time: "14:30",
    });
  });

  it("formats YYYY-MM-DD without shifting to the previous UTC day", () => {
    assert.equal(formatPkCalendarDate("2026-09-08"), "September 8, 2026");
  });
});
