import { describe, expect, it } from "vitest";

import { getFirstResponseTimer, getResolutionTimer } from "@/lib/sla";
import { getSlaIndicatorPresentation } from "@/components/tickets/SlaIndicator";
import type { TicketSla } from "@/types/tickets";

const BASE_TIME = Date.parse("2026-10-04T10:00:00.000Z");

function iso(milliseconds: number) {
  return new Date(BASE_TIME + milliseconds).toISOString();
}

function createSla(overrides: Partial<TicketSla> = {}): TicketSla {
  return {
    id: "sla-1",
    firstResponseMinutes: 30,
    resolutionMinutes: 120,
    firstResponseDueAt: iso(30 * 60 * 1000),
    resolutionDueAt: iso(120 * 60 * 1000),
    firstRespondedAt: null,
    firstResponseBreachedAt: null,
    resolutionBreachedAt: null,
    ...overrides,
  };
}

function getPresentation(
  sla: TicketSla,
  now: number,
  resolvedAt: string | null = null,
) {
  const firstResponse = getFirstResponseTimer(sla, iso(0), now);

  const resolution = getResolutionTimer(sla, iso(0), resolvedAt, now);

  return getSlaIndicatorPresentation(firstResponse, resolution);
}

describe("getSlaIndicatorPresentation", () => {
  it("prioritizes breached state", () => {
    const sla = createSla({
      firstResponseBreachedAt: iso(31 * 60 * 1000),
    });

    expect(getPresentation(sla, BASE_TIME + 60 * 60 * 1000)).toEqual({
      state: "BREACHED",
      label: "SLA breached",
    });
  });

  it("shows overdue when a due time has passed", () => {
    const sla = createSla();

    expect(getPresentation(sla, BASE_TIME + 45 * 60 * 1000)).toEqual({
      state: "OVERDUE",
      label: "SLA overdue",
    });
  });

  it("shows first-response countdown while first response is running", () => {
    const sla = createSla();

    const result = getPresentation(sla, BASE_TIME + 10 * 60 * 1000);

    expect(result.state).toBe("FIRST_RESPONSE");

    if (result.state === "FIRST_RESPONSE") {
      expect(result.remainingMs).toBe(20 * 60 * 1000);
    }
  });

  it("shows resolution countdown after first response completes", () => {
    const sla = createSla({
      firstRespondedAt: iso(15 * 60 * 1000),
    });

    const result = getPresentation(sla, BASE_TIME + 60 * 60 * 1000);

    expect(result.state).toBe("RESOLUTION");

    if (result.state === "RESOLUTION") {
      expect(result.remainingMs).toBe(60 * 60 * 1000);
    }
  });

  it("shows completed when both SLA targets are completed", () => {
    const sla = createSla({
      firstRespondedAt: iso(15 * 60 * 1000),
    });

    expect(
      getPresentation(sla, BASE_TIME + 150 * 60 * 1000, iso(90 * 60 * 1000)),
    ).toEqual({
      state: "COMPLETED",
      label: "SLA completed",
    });
  });
});
