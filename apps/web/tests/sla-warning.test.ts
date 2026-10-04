import { describe, expect, it } from "vitest";

import {
  getSlaWarningThresholdMs,
  isSlaWarning,
  SLA_WARNING_THRESHOLD_RATIO,
} from "@/lib/sla-warning";

import { getSlaTimer } from "@/lib/sla";

describe("SLA warning threshold", () => {
  it("uses 20% of the original SLA window", () => {
    expect(SLA_WARNING_THRESHOLD_RATIO).toBe(0.2);
  });

  it("calculates the warning threshold correctly", () => {
    expect(getSlaWarningThresholdMs(60 * 60 * 1000)).toBe(12 * 60 * 1000);
  });

  it("returns warning at exactly 20% remaining", () => {
    const originalDurationMs = 60 * 60 * 1000;
    const remainingMs = originalDurationMs * 0.2;

    expect(isSlaWarning(remainingMs, originalDurationMs)).toBe(true);
  });

  it("returns warning below 20% remaining", () => {
    const originalDurationMs = 60 * 60 * 1000;
    const remainingMs = originalDurationMs * 0.199;

    expect(isSlaWarning(remainingMs, originalDurationMs)).toBe(true);
  });

  it("does not warn above 20% remaining", () => {
    const originalDurationMs = 60 * 60 * 1000;
    const remainingMs = originalDurationMs * 0.201;

    expect(isSlaWarning(remainingMs, originalDurationMs)).toBe(false);
  });

  it("does not warn when the SLA is due", () => {
    expect(isSlaWarning(0, 60 * 60 * 1000)).toBe(false);
  });

  it("does not warn after the SLA is overdue", () => {
    expect(isSlaWarning(-1, 60 * 60 * 1000)).toBe(false);
  });

  it("does not warn for an invalid SLA duration", () => {
    expect(isSlaWarning(1000, 0)).toBe(false);
  });

  it("marks a running timer as warning at the boundary", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const now = new Date("2026-10-04T10:48:00.000Z").getTime();

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.remainingMs).toBe(12 * 60 * 1000);
    expect(result.isWarning).toBe(true);
  });

  it("does not warn just above the boundary", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const now = new Date("2026-10-04T10:47:59.000Z").getTime();

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(false);
  });

  it("does not turn an overdue timer into a warning", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const now = new Date("2026-10-04T11:01:00.000Z").getTime();

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("OVERDUE");
    expect(result.isWarning).toBe(false);
  });

  it("does not turn a breached timer into a warning", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";
    const breachedAt = "2026-10-04T11:01:00.000Z";

    const now = new Date("2026-10-04T11:02:00.000Z").getTime();

    const result = getSlaTimer(startedAt, dueAt, null, breachedAt, now);

    expect(result.state).toBe("BREACHED");
    expect(result.isWarning).toBe(false);
  });
});
