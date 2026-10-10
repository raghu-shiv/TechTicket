import { describe, expect, it } from "vitest";

import {
  buildTicketLibraryReportDrilldownUrl,
  ticketLibraryReportParamsFromSearchParams,
  updateTicketLibraryReportSearchParams,
} from "@/lib/ticket-library-report-drilldown";

describe("Ticket Library report drill-down", () => {
  it("preserves other filters when adding a status filter", () => {
    const current = new URLSearchParams(
      "priority=HIGH&teamId=team-support&createdFrom=2026-09-11&createdTo=2026-10-10&page=3",
    );

    const href = buildTicketLibraryReportDrilldownUrl(current, {
      status: "OPEN",
    });

    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.get("status")).toBe("OPEN");
    expect(params.get("priority")).toBe("HIGH");
    expect(params.get("teamId")).toBe("team-support");
    expect(params.get("createdFrom")).toBe("2026-09-11");
    expect(params.get("createdTo")).toBe("2026-10-10");
    expect(params.has("page")).toBe(false);
  });

  it("replaces the selected priority while retaining team and date filters", () => {
    const current = new URLSearchParams(
      "priority=HIGH&teamId=team-support&createdFrom=2026-09-11",
    );

    const href = buildTicketLibraryReportDrilldownUrl(current, {
      priority: "URGENT",
    });

    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.get("priority")).toBe("URGENT");
    expect(params.get("teamId")).toBe("team-support");
    expect(params.get("createdFrom")).toBe("2026-09-11");
  });

  it("removes teamId when opening the unassigned-team bucket", () => {
    const current = new URLSearchParams("teamId=team-support&priority=HIGH");

    const href = buildTicketLibraryReportDrilldownUrl(current, {
      teamId: null,
      unassignedTeam: true,
    });

    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.has("teamId")).toBe(false);
    expect(params.get("unassignedTeam")).toBe("true");
    expect(params.get("priority")).toBe("HIGH");
  });

  it("removes assigneeId when opening the unassigned bucket", () => {
    const current = new URLSearchParams(
      "assigneeId=user-agent&teamId=team-support",
    );

    const href = buildTicketLibraryReportDrilldownUrl(current, {
      assigneeId: null,
      unassigned: true,
    });

    const params = new URLSearchParams(href.split("?")[1]);

    expect(params.has("assigneeId")).toBe(false);
    expect(params.get("unassigned")).toBe("true");
    expect(params.get("teamId")).toBe("team-support");
  });

  it("converts URL state into report request parameters", () => {
    const params = new URLSearchParams(
      "priority=HIGH&teamId=team-support&unassigned=true&dateField=updatedAt&createdFrom=2026-09-11",
    );

    const result = ticketLibraryReportParamsFromSearchParams(params);

    expect(result.priority).toBe("HIGH");
    expect(result.teamId).toBe("team-support");
    expect(result.unassigned).toBe(true);
    expect(result.dateField).toBe("updatedAt");
    expect(result.createdFrom).toBe("2026-09-11");
  });

  it("changes only the supplied filters in report URL state", () => {
    const current = new URLSearchParams(
      "priority=HIGH&teamId=team-support&dateField=createdAt&createdFrom=2026-09-11",
    );

    const updated = updateTicketLibraryReportSearchParams(current, {
      priority: null,
      status: "OPEN",
    });

    expect(updated.has("priority")).toBe(false);
    expect(updated.get("status")).toBe("OPEN");
    expect(updated.get("teamId")).toBe("team-support");
    expect(updated.get("dateField")).toBe("createdAt");
    expect(updated.get("createdFrom")).toBe("2026-09-11");
  });
});
