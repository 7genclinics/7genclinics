import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  GRACE_MINUTES_AFTER_START,
  getAppointmentSessionTiming,
} from "./session-timing.ts";

const DURATION = 30;

describe("getAppointmentSessionTiming", () => {
  it("allows start during grace after scheduled start", () => {
    const scheduledAt = "2026-07-13T10:00:00.000Z";
    const start = new Date(scheduledAt).getTime();
    const timing = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: DURATION,
      status: "scheduled",
      now: start + 3 * 60_000,
    });
    assert.equal(timing.phase, "grace_warning");
    assert.equal(timing.canStartCall, true);
    assert.equal(timing.showWarning, true);
  });

  it("blocks start after grace expires", () => {
    const scheduledAt = "2026-07-13T10:00:00.000Z";
    const start = new Date(scheduledAt).getTime();
    const timing = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: DURATION,
      status: "scheduled",
      now: start + (GRACE_MINUTES_AFTER_START + 1) * 60_000,
    });
    assert.equal(timing.phase, "expired_pending");
    assert.equal(timing.canStartCall, false);
    assert.equal(timing.shouldAutoExpire, true);
  });

  it("ongoing sessions stay joinable during the booked window", () => {
    const timing = getAppointmentSessionTiming({
      scheduledAt: "2026-07-13T10:00:00.000Z",
      durationMinutes: DURATION,
      status: "ongoing",
      now: Date.parse("2026-07-13T10:10:00.000Z"),
    });
    assert.equal(timing.phase, "ongoing");
    assert.equal(timing.canJoin, true);
    assert.equal(timing.shouldAutoComplete, false);
  });

  it("blocks rejoin after booked end even if status stayed ongoing", () => {
    const timing = getAppointmentSessionTiming({
      scheduledAt: "2026-07-13T10:00:00.000Z",
      durationMinutes: DURATION,
      status: "ongoing",
      now: Date.parse("2026-07-13T10:43:00.000Z"),
    });
    assert.equal(timing.phase, "ongoing_ended");
    assert.equal(timing.canJoin, false);
    assert.equal(timing.canStartCall, false);
    assert.equal(timing.shouldAutoComplete, true);
    assert.match(timing.countdownLabel ?? "", /ended/i);
  });

  it("allows doctor to start during the 10-minute early window", () => {
    const scheduledAt = "2026-07-13T10:00:00.000Z";
    const start = new Date(scheduledAt).getTime();
    const timing = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: DURATION,
      status: "scheduled",
      now: start - 5 * 60_000,
    });
    assert.equal(timing.phase, "reminder");
    assert.equal(timing.canJoin, true);
    assert.equal(timing.canStartCall, true);
  });

  it("accurately handles 15, 30, and 60 minute slot duration boundaries", () => {
    const scheduledAt = "2026-07-13T10:00:00.000Z";
    const start = new Date(scheduledAt).getTime();

    // 15-minute slot
    const timing15Active = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: 15,
      status: "ongoing",
      now: start + 14 * 60_000,
    });
    assert.equal(timing15Active.phase, "ongoing");
    assert.equal(timing15Active.shouldAutoComplete, false);

    const timing15Ended = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: 15,
      status: "ongoing",
      now: start + 15 * 60_000,
    });
    assert.equal(timing15Ended.phase, "ongoing_ended");
    assert.equal(timing15Ended.shouldAutoComplete, true);

    // 30-minute slot
    const timing30Active = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: 30,
      status: "ongoing",
      now: start + 29 * 60_000,
    });
    assert.equal(timing30Active.phase, "ongoing");
    assert.equal(timing30Active.shouldAutoComplete, false);

    const timing30Ended = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: 30,
      status: "ongoing",
      now: start + 30 * 60_000,
    });
    assert.equal(timing30Ended.phase, "ongoing_ended");
    assert.equal(timing30Ended.shouldAutoComplete, true);

    // 60-minute slot
    const timing60Active = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: 60,
      status: "ongoing",
      now: start + 59 * 60_000,
    });
    assert.equal(timing60Active.phase, "ongoing");
    assert.equal(timing60Active.shouldAutoComplete, false);

    const timing60Ended = getAppointmentSessionTiming({
      scheduledAt,
      durationMinutes: 60,
      status: "ongoing",
      now: start + 60 * 60_000,
    });
    assert.equal(timing60Ended.phase, "ongoing_ended");
    assert.equal(timing60Ended.shouldAutoComplete, true);
  });
});
