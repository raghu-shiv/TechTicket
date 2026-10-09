import { describe, expect, it } from "vitest";

import {
  buildSlaReportParams,
  DEFAULT_SLA_REPORT_FILTERS,
  isValidSlaReportDateRange,
  parseSlaReportFilters,
  serializeSlaReportFilters,
} from "@/components/reports/SlaReport";

describe("SLA report filter utilities", () => {
  it("returns the default filter state for an empty query", () => {
    expect(parseSlaReportFilters("")).toEqual(DEFAULT_SLA_REPORT_FILTERS);
  });

  it("parses supported filters from a query string", () => {
    const filters = parseSlaReportFilters(
      "?from=2026-10-01&to=2026-10-09&dateField=updatedAt&status=OPEN&priority=HIGH&type=INCIDENT&unassigned=true",
    );

    expect(filters).toMatchObject({
      from: "2026-10-01",
      to: "2026-10-09",
      dateField: "updatedAt",
      status: "OPEN",
      priority: "HIGH",
      type: "INCIDENT",
      unassigned: "true",
    });
  });

  it("ignores an unsupported date field", () => {
    const filters = parseSlaReportFilters("?dateField=invalid");

    expect(filters.dateField).toBe("createdAt");
  });

  it("clears unassigned when an assignee ID is also present in the URL", () => {
    const filters = parseSlaReportFilters(
      "?assigneeId=user-123&unassigned=true",
    );

    expect(filters.assigneeId).toBe("user-123");
    expect(filters.unassigned).toBe("");
  });

  it("clears unassignedTeam when a team ID is also present in the URL", () => {
    const filters = parseSlaReportFilters(
      "?teamId=team-123&unassignedTeam=true",
    );

    expect(filters.teamId).toBe("team-123");
    expect(filters.unassignedTeam).toBe("");
  });

  it("serializes only non-empty filter values", () => {
    const filters = {
      ...DEFAULT_SLA_REPORT_FILTERS,
      from: "2026-10-01",
      to: "2026-10-09",
      status: "OPEN",
      assigneeId: "user-123",
    };

    const query = serializeSlaReportFilters(filters);
    const params = new URLSearchParams(query);

    expect(params.get("from")).toBe("2026-10-01");
    expect(params.get("to")).toBe("2026-10-09");
    expect(params.get("status")).toBe("OPEN");
    expect(params.get("assigneeId")).toBe("user-123");
    expect(params.has("priority")).toBe(false);
  });

  it("round-trips filters through serialization and parsing", () => {
    const filters = {
      ...DEFAULT_SLA_REPORT_FILTERS,
      from: "2026-10-01",
      to: "2026-10-09",
      dateField: "updatedAt" as const,
      status: "RESOLVED",
      priority: "URGENT",
      requesterId: "requester-123",
      productId: "product-123",
    };

    const result = parseSlaReportFilters(serializeSlaReportFilters(filters));

    expect(result).toEqual(filters);
  });

  it("accepts an empty date range", () => {
    expect(isValidSlaReportDateRange("", "")).toBe(true);
  });

  it("accepts a valid date range", () => {
    expect(isValidSlaReportDateRange("2026-10-01", "2026-10-09")).toBe(true);
  });

  it("rejects a date range where the start is after the end", () => {
    expect(isValidSlaReportDateRange("2026-10-10", "2026-10-09")).toBe(false);
  });

  it("converts filter values to the API parameter shape", () => {
    const params = buildSlaReportParams({
      ...DEFAULT_SLA_REPORT_FILTERS,
      from: "2026-10-01",
      to: "2026-10-09",
      dateField: "updatedAt",
      status: "OPEN",
      priority: "HIGH",
      type: "INCIDENT",
      teamId: "team-123",
      assigneeId: "user-123",
      requesterId: "requester-123",
      productId: "product-123",
    });

    expect(params).toEqual({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-09T23:59:59.999Z",
      dateField: "updatedAt",
      status: "OPEN",
      priority: "HIGH",
      type: "INCIDENT",
      teamId: "team-123",
      assigneeId: "user-123",
      requesterId: "requester-123",
      productId: "product-123",
      unassigned: undefined,
      unassignedTeam: undefined,
    });
  });

  it("does not send an inverted date range to the API", () => {
    const params = buildSlaReportParams({
      ...DEFAULT_SLA_REPORT_FILTERS,
      from: "2026-10-10",
      to: "2026-10-09",
    });

    expect(params.from).toBeUndefined();
    expect(params.to).toBeUndefined();
  });

  it("converts assignment filters to booleans", () => {
    const params = buildSlaReportParams({
      ...DEFAULT_SLA_REPORT_FILTERS,
      unassigned: "true",
      unassignedTeam: "false",
    });

    expect(params.unassigned).toBe(true);
    expect(params.unassignedTeam).toBe(false);
  });
});
