import { describe, expect, it } from "vitest";

import { SLA_WARNING_THRESHOLD_RATIO } from "@/lib/sla-warning";

describe("SLA warning threshold", () => {
  it("uses 20% of the original SLA window as the warning threshold", () => {
    expect(SLA_WARNING_THRESHOLD_RATIO).toBe(0.2);
  });

  it("represents exactly 20% remaining", () => {
    expect(SLA_WARNING_THRESHOLD_RATIO * 100).toBe(20);
  });
});
