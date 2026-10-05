import { describe, expect, it } from "vitest";

import {
  hasSavedFilterCriteria,
  savedFilterToSearchParams,
  searchParamsToSavedFilter,
} from "@/lib/saved-filters";

describe("SLA breach ticket filtering", () => {
  it("reads slaBreached=true from the ticket-library URL", () => {
    const params = new URLSearchParams("slaBreached=true");

    expect(searchParamsToSavedFilter(params)).toMatchObject({
      slaBreached: true,
    });
  });

  it("does not enable the SLA breach filter for other values", () => {
    const params = new URLSearchParams("slaBreached=false");

    expect(searchParamsToSavedFilter(params)).not.toHaveProperty("slaBreached");
  });

  it("preserves slaBreached when converting a saved filter to URL parameters", () => {
    const params = savedFilterToSearchParams({
      slaBreached: true,
    });

    expect(params.get("slaBreached")).toBe("true");
  });

  it("recognizes slaBreached as saved-filter criteria", () => {
    expect(
      hasSavedFilterCriteria({
        slaBreached: true,
      }),
    ).toBe(true);
  });

  it("does not treat an inactive SLA breach filter as criteria", () => {
    expect(
      hasSavedFilterCriteria({
        slaBreached: false,
      }),
    ).toBe(false);
  });
});
