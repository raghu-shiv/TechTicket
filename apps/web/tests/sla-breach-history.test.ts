import { describe, expect, it } from "vitest";

import {
  getSlaBreachActivityActorName,
  getSlaBreachActivityLabel,
} from "@/lib/sla-history";

describe("SLA breach history presentation", () => {
  it("labels first response breaches", () => {
    expect(getSlaBreachActivityLabel("SLA_FIRST_RESPONSE_BREACHED")).toBe(
      "First response SLA breached",
    );
  });

  it("labels resolution breaches", () => {
    expect(getSlaBreachActivityLabel("SLA_RESOLUTION_BREACHED")).toBe(
      "Resolution SLA breached",
    );
  });

  it("falls back to System for activity without an actor", () => {
    expect(getSlaBreachActivityActorName(null)).toBe("System");
  });

  it("uses the recorded actor name", () => {
    expect(
      getSlaBreachActivityActorName({
        name: "Support Agent",
      }),
    ).toBe("Support Agent");
  });
});
