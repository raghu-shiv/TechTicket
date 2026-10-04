import { describe, expect, it } from "vitest";

import {
  getSlaWarningThresholdMs,
  isSlaWarning,
  SLA_WARNING_THRESHOLD_RATIO,
} from "@/lib/sla-warning";

import { getSlaTimer } from "@/lib/sla";

import { getSlaIndicatorPresentation } from "@/components/tickets/SlaIndicator";

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

describe("SLA warning presentation", () => {
  it("marks first response as warning when inside the threshold", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const now = new Date("2026-10-04T10:50:00.000Z").getTime();

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(true);
  });

  it("does not mark first response as warning outside the threshold", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const now = new Date("2026-10-04T10:40:00.000Z").getTime();

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(false);
  });

  it("preserves warning state independently for resolution", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const now = new Date("2026-10-04T10:50:00.000Z").getTime();

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(true);
  });
});

describe("SlaIndicator warning presentation", () => {
  it("shows warning before normal running countdown", () => {
    const firstResponse = {
      state: "RUNNING" as const,
      remainingMs: 12 * 60 * 1000,
      elapsedMs: 48 * 60 * 1000,
      dueAt: "2026-10-04T11:00:00.000Z",
      completedAt: null,
      breachedAt: null,
      warningThresholdMs: 12 * 60 * 1000,
      isWarning: true,
    };

    const resolution = {
      ...firstResponse,
      remainingMs: 60 * 60 * 1000,
      warningThresholdMs: 12 * 60 * 1000,
      isWarning: false,
    };

    const result = getSlaIndicatorPresentation(firstResponse, resolution);

    expect(result).toEqual({
      state: "WARNING",
      remainingMs: 12 * 60 * 1000,
    });
  });

  it("prioritizes breached over warning", () => {
    const firstResponse = {
      state: "BREACHED" as const,
      remainingMs: 0,
      elapsedMs: 61 * 60 * 1000,
      dueAt: "2026-10-04T11:00:00.000Z",
      completedAt: null,
      breachedAt: "2026-10-04T11:01:00.000Z",
      warningThresholdMs: 12 * 60 * 1000,
      isWarning: false,
    };

    const resolution = {
      state: "RUNNING" as const,
      remainingMs: 10 * 60 * 1000,
      elapsedMs: 50 * 60 * 1000,
      dueAt: "2026-10-04T11:00:00.000Z",
      completedAt: null,
      breachedAt: null,
      warningThresholdMs: 12 * 60 * 1000,
      isWarning: true,
    };

    const result = getSlaIndicatorPresentation(firstResponse, resolution);

    expect(result).toEqual({
      state: "BREACHED",
      label: "SLA breached",
    });
  });

  it("prioritizes overdue over warning", () => {
    const firstResponse = {
      state: "OVERDUE" as const,
      remainingMs: 0,
      elapsedMs: 61 * 60 * 1000,
      dueAt: "2026-10-04T11:00:00.000Z",
      completedAt: null,
      breachedAt: null,
      warningThresholdMs: 12 * 60 * 1000,
      isWarning: false,
    };

    const resolution = {
      state: "RUNNING" as const,
      remainingMs: 10 * 60 * 1000,
      elapsedMs: 50 * 60 * 1000,
      dueAt: "2026-10-04T11:00:00.000Z",
      completedAt: null,
      breachedAt: null,
      warningThresholdMs: 12 * 60 * 1000,
      isWarning: true,
    };

    const result = getSlaIndicatorPresentation(firstResponse, resolution);

    expect(result).toEqual({
      state: "OVERDUE",
      label: "SLA overdue",
    });
  });
});

describe("SLA warning realtime behavior", () => {
  it("derives warning state from the current clock without a realtime event", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const beforeWarning = getSlaTimer(
      startedAt,
      dueAt,
      null,
      null,
      new Date("2026-10-04T10:47:00.000Z").getTime(),
    );

    expect(beforeWarning.state).toBe("RUNNING");
    expect(beforeWarning.isWarning).toBe(false);

    const insideWarningWindow = getSlaTimer(
      startedAt,
      dueAt,
      null,
      null,
      new Date("2026-10-04T10:48:00.000Z").getTime(),
    );

    expect(insideWarningWindow.state).toBe("RUNNING");
    expect(insideWarningWindow.isWarning).toBe(true);
  });

  it("does not require a breach event to enter the warning state", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const result = getSlaTimer(
      startedAt,
      dueAt,
      null,
      null,
      new Date("2026-10-04T10:50:00.000Z").getTime(),
    );

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(true);
    expect(result.breachedAt).toBeNull();
  });

  it("preserves breach semantics after the warning window", () => {
    const startedAt = "2026-10-04T10:00:00.000Z";
    const dueAt = "2026-10-04T11:00:00.000Z";

    const result = getSlaTimer(
      startedAt,
      dueAt,
      null,
      "2026-10-04T11:01:00.000Z",
      new Date("2026-10-04T11:02:00.000Z").getTime(),
    );

    expect(result.state).toBe("BREACHED");
    expect(result.isWarning).toBe(false);
  });
});

describe("SLA warning boundary conditions", () => {
  const startedAt = "2026-10-04T10:00:00.000Z";
  const dueAt = "2026-10-04T11:00:00.000Z";

  const originalDurationMs = 60 * 60 * 1000;
  const warningThresholdMs = originalDurationMs * 0.2;

  it("is normal just above the 20% boundary", () => {
    const now = new Date(dueAt).getTime() - warningThresholdMs - 1;

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(false);
    expect(result.remainingMs).toBe(warningThresholdMs + 1);
  });

  it("enters warning at exactly 20% remaining", () => {
    const now = new Date(dueAt).getTime() - warningThresholdMs;

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(true);
    expect(result.remainingMs).toBe(warningThresholdMs);
  });

  it("remains in warning just below the 20% boundary", () => {
    const now = new Date(dueAt).getTime() - warningThresholdMs + 1;

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(true);
    expect(result.remainingMs).toBe(warningThresholdMs - 1);
  });

  it("stops warning exactly at the SLA due time", () => {
    const now = new Date(dueAt).getTime();

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("OVERDUE");
    expect(result.isWarning).toBe(false);
    expect(result.remainingMs).toBe(0);
  });

  it("stays overdue after the due time", () => {
    const now = new Date(dueAt).getTime() + 1;

    const result = getSlaTimer(startedAt, dueAt, null, null, now);

    expect(result.state).toBe("OVERDUE");
    expect(result.isWarning).toBe(false);
  });

  it("breached state always overrides warning", () => {
    const now = new Date(dueAt).getTime() - warningThresholdMs;

    const result = getSlaTimer(
      startedAt,
      dueAt,
      null,
      "2026-10-04T10:59:00.000Z",
      now,
    );

    expect(result.state).toBe("BREACHED");
    expect(result.isWarning).toBe(false);
  });

  it("completed SLA does not remain warning when completed outside the threshold", () => {
    const completedAt = "2026-10-04T10:30:00.000Z";

    const result = getSlaTimer(
      startedAt,
      dueAt,
      completedAt,
      null,
      new Date("2026-10-04T10:30:00.000Z").getTime(),
    );

    expect(result.state).toBe("COMPLETED");
    expect(result.isWarning).toBe(false);
  });

  it("completed SLA can retain warning metadata when completed inside the threshold", () => {
    const completedAt = "2026-10-04T10:50:00.000Z";

    const result = getSlaTimer(
      startedAt,
      dueAt,
      completedAt,
      null,
      new Date(completedAt).getTime(),
    );

    expect(result.state).toBe("COMPLETED");
    expect(result.isWarning).toBe(true);
  });

  it("handles a 15-minute SLA using the same proportional threshold", () => {
    const shortStartedAt = "2026-10-04T10:00:00.000Z";
    const shortDueAt = "2026-10-04T10:15:00.000Z";

    const now = new Date(shortDueAt).getTime() - 3 * 60 * 1000;

    const result = getSlaTimer(shortStartedAt, shortDueAt, null, null, now);

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(true);
    expect(result.remainingMs).toBe(3 * 60 * 1000);
  });

  it("handles a 24-hour SLA using the same proportional threshold", () => {
    const longStartedAt = "2026-10-04T00:00:00.000Z";
    const longDueAt = "2026-10-05T00:00:00.000Z";

    const warningThresholdMs = 24 * 60 * 60 * 1000 * 0.2;

    // 4h48m + 1ms remaining → outside warning window.
    const justAboveWarning = getSlaTimer(
      longStartedAt,
      longDueAt,
      null,
      null,
      new Date(longDueAt).getTime() - warningThresholdMs - 1,
    );

    expect(justAboveWarning.state).toBe("RUNNING");
    expect(justAboveWarning.isWarning).toBe(false);

    // Exactly 4h48m remaining → warning.
    const atWarningBoundary = getSlaTimer(
      longStartedAt,
      longDueAt,
      null,
      null,
      new Date(longDueAt).getTime() - warningThresholdMs,
    );

    expect(atWarningBoundary.state).toBe("RUNNING");
    expect(atWarningBoundary.isWarning).toBe(true);
  });
});

describe("SLA warning proportional behavior", () => {
  it.each([
    {
      name: "15 minutes",
      durationMs: 15 * 60 * 1000,
    },
    {
      name: "30 minutes",
      durationMs: 30 * 60 * 1000,
    },
    {
      name: "1 hour",
      durationMs: 60 * 60 * 1000,
    },
    {
      name: "2 hours",
      durationMs: 2 * 60 * 60 * 1000,
    },
    {
      name: "4 hours",
      durationMs: 4 * 60 * 60 * 1000,
    },
    {
      name: "8 hours",
      durationMs: 8 * 60 * 60 * 1000,
    },
    {
      name: "24 hours",
      durationMs: 24 * 60 * 60 * 1000,
    },
  ])("uses 20% remaining for $name", ({ durationMs }) => {
    const startedMs = Date.parse("2026-10-04T00:00:00.000Z");

    const dueMs = startedMs + durationMs;
    const warningMs = durationMs * 0.2;

    const result = getSlaTimer(
      new Date(startedMs).toISOString(),
      new Date(dueMs).toISOString(),
      null,
      null,
      dueMs - warningMs,
    );

    expect(result.state).toBe("RUNNING");
    expect(result.isWarning).toBe(true);
    expect(result.remainingMs).toBe(warningMs);
  });
});
