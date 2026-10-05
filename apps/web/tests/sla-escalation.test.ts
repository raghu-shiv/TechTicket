import { describe, expect, it } from "vitest";

import {
  getSlaEscalationBreachLabel,
  getSlaEscalationLabel,
  sortSlaEscalations,
} from "@/lib/sla-escalation";

describe("SLA escalation presentation", () => {
  it("labels first response escalation", () => {
    expect(getSlaEscalationLabel("FIRST_RESPONSE_BREACH")).toBe(
      "First response escalation",
    );
  });

  it("labels resolution escalation", () => {
    expect(getSlaEscalationLabel("RESOLUTION_BREACH")).toBe(
      "Resolution escalation",
    );
  });

  it("labels first response breach", () => {
    expect(getSlaEscalationBreachLabel("FIRST_RESPONSE_BREACH")).toBe(
      "First response SLA breached",
    );
  });

  it("labels resolution breach", () => {
    expect(getSlaEscalationBreachLabel("RESOLUTION_BREACH")).toBe(
      "Resolution SLA breached",
    );
  });

  it("sorts escalation records newest first", () => {
    const escalations = [
      {
        id: "older",
        type: "FIRST_RESPONSE_BREACH" as const,
        createdAt: "2026-10-05T09:00:00.000Z",
      },
      {
        id: "newer",
        type: "RESOLUTION_BREACH" as const,
        createdAt: "2026-10-05T10:00:00.000Z",
      },
    ];

    expect(sortSlaEscalations(escalations).map((item) => item.id)).toEqual([
      "newer",
      "older",
    ]);
  });

  it("does not mutate the original escalation array", () => {
    const escalations = [
      {
        id: "older",
        type: "FIRST_RESPONSE_BREACH" as const,
        createdAt: "2026-10-05T09:00:00.000Z",
      },
      {
        id: "newer",
        type: "RESOLUTION_BREACH" as const,
        createdAt: "2026-10-05T10:00:00.000Z",
      },
    ];

    const original = [...escalations];

    sortSlaEscalations(escalations);

    expect(escalations).toEqual(original);
  });
});
