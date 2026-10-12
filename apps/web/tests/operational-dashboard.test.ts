import { afterEach, describe, expect, it, vi } from "vitest";

import { getAnalyticsDashboard } from "@/lib/api/analytics-dashboard";
import {
  aggregateActiveWorkload,
  buildRoleScopedAnalyticsParams,
  buildRoleScopedTicketParams,
  compareWeeklyTicketVolume,
  dashboardDataState,
  formatWeeklyComparison,
  getPriorityLabel,
  normalizeVolumeTrend,
  type ActiveTicketStatus,
} from "@/lib/dashboard/operational-dashboard";
import type { AnalyticsDashboardResponse } from "@/types/analytics-dashboard";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function analyticsResponse(input: {
  total?: number;
  unassigned?: number;
  slaBreached?: number;
  priorities?: Partial<Record<"URGENT" | "HIGH" | "MEDIUM" | "LOW", number>>;
}): AnalyticsDashboardResponse {
  const total = input.total ?? 0;
  const priorities = input.priorities ?? {};
  const priorityDistribution = Object.entries(priorities).map(
    ([key, count]) => ({
      key,
      label: key,
      count: count ?? 0,
      percentage:
        total === 0 ? 0 : Number((((count ?? 0) / total) * 100).toFixed(1)),
    }),
  );
  const slaBreached = input.slaBreached ?? 0;

  return {
    data: {
      metrics: {
        total,
        active: total,
        resolvedClosed: 0,
        unassigned: input.unassigned ?? 0,
        sla: {
          tracked: slaBreached,
          breached: slaBreached,
          compliant: 0,
          complianceRate: slaBreached === 0 ? null : 0,
          firstResponse: {
            completed: 0,
            compliant: 0,
            breached: 0,
            complianceRate: null,
          },
          resolution: {
            completed: 0,
            compliant: 0,
            breached: 0,
            complianceRate: null,
          },
        },
        tat: {
          resolved: 0,
          averageResolutionMinutes: null,
          medianResolutionMinutes: null,
        },
      },
      volumeTrend: [],
      priorityDistribution,
      teamWorkload: [],
      assigneeWorkload: [],
    },
    meta: {
      query: {
        dateField: "createdAt",
        dateFrom: null,
        dateTo: null,
        organizationScoped: true,
        queryVersion: 1,
      },
    },
  };
}

function workloadResponses(
  values: Record<ActiveTicketStatus, Parameters<typeof analyticsResponse>[0]>,
) {
  return {
    OPEN: analyticsResponse(values.OPEN),
    IN_PROGRESS: analyticsResponse(values.IN_PROGRESS),
    PENDING: analyticsResponse(values.PENDING),
  };
}

describe("operational dashboard data helpers", () => {
  it("combines actual status-filtered aggregates into current active workload", () => {
    const result = aggregateActiveWorkload(
      workloadResponses({
        OPEN: {
          total: 2,
          unassigned: 1,
          slaBreached: 1,
          priorities: { URGENT: 1, HIGH: 1 },
        },
        IN_PROGRESS: {
          total: 2,
          unassigned: 1,
          priorities: { MEDIUM: 2 },
        },
        PENDING: {
          total: 1,
          unassigned: 1,
          slaBreached: 1,
          priorities: { URGENT: 1 },
        },
      }),
    );

    expect(result.activeTickets).toBe(5);
    expect(result.unassignedActiveTickets).toBe(3);
    expect(result.activeSlaBreaches).toBe(2);
    expect(result.priorityDistribution).toEqual([
      { key: "URGENT", label: "Urgent", count: 2, percentage: 40 },
      { key: "HIGH", label: "High", count: 1, percentage: 20 },
      { key: "MEDIUM", label: "Medium", count: 2, percentage: 40 },
      { key: "LOW", label: "Low", count: 0, percentage: 0 },
    ]);
    expect(
      result.priorityDistribution.reduce((sum, point) => sum + point.count, 0),
    ).toBe(result.activeTickets);
  });

  it("represents a genuine empty workload as zero counts, not fallback values", () => {
    const empty = analyticsResponse({});
    const result = aggregateActiveWorkload({
      OPEN: empty,
      IN_PROGRESS: empty,
      PENDING: empty,
    });

    expect(result.activeTickets).toBe(0);
    expect(result.unassignedActiveTickets).toBe(0);
    expect(result.activeSlaBreaches).toBe(0);
    expect(
      result.priorityDistribution.every((point) => point.count === 0),
    ).toBe(true);
  });

  it("maps URGENT to Urgent and never introduces a Critical priority", () => {
    expect(getPriorityLabel("URGENT")).toBe("Urgent");
    expect(getPriorityLabel("HIGH")).toBe("High");
    expect(getPriorityLabel("MEDIUM")).toBe("Medium");
    expect(getPriorityLabel("LOW")).toBe("Low");
    expect(["Urgent", "High", "Medium", "Low"]).not.toContain("Critical");
  });

  it("normalizes sparse volume data with zero-count calendar days", () => {
    const points = normalizeVolumeTrend(
      [
        { date: "2026-10-10T00:00:00.000Z", count: 2 },
        { date: "2026-10-12T00:00:00.000Z", count: 1 },
      ],
      "2026-10-10T00:00:00.000Z",
      "2026-10-12T23:59:59.999Z",
    );

    expect(points).toEqual([
      { date: "2026-10-10T00:00:00.000Z", count: 2 },
      { date: "2026-10-11T00:00:00.000Z", count: 0 },
      { date: "2026-10-12T00:00:00.000Z", count: 1 },
    ]);
  });

  it("calculates a real comparison from two equal seven-complete-day windows", () => {
    const points = normalizeVolumeTrend(
      [
        { date: "2026-09-28T00:00:00.000Z", count: 1 },
        { date: "2026-09-29T00:00:00.000Z", count: 1 },
        { date: "2026-10-05T00:00:00.000Z", count: 2 },
        { date: "2026-10-06T00:00:00.000Z", count: 3 },
      ],
      "2026-09-28",
      "2026-10-12",
    );
    const comparison = compareWeeklyTicketVolume(points, "2026-10-12");

    expect(comparison).toEqual({
      currentTotal: 5,
      previousTotal: 2,
      changePercentage: 150,
    });
    expect(formatWeeklyComparison(comparison)).toBe(
      "+150.0% vs previous 7 days",
    );
  });

  it("omits percentage changes when the previous period has no valid baseline", () => {
    const points = normalizeVolumeTrend(
      [{ date: "2026-10-10T00:00:00.000Z", count: 3 }],
      "2026-09-28",
      "2026-10-12",
    );
    const comparison = compareWeeklyTicketVolume(points, "2026-10-12");

    expect(comparison.currentTotal).toBe(3);
    expect(comparison.previousTotal).toBe(0);
    expect(comparison.changePercentage).toBeNull();
    expect(formatWeeklyComparison(comparison)).toBe("No prior-period baseline");
  });

  it("scopes requester UI queries to their user while preserving agent organization aggregates", () => {
    expect(
      buildRoleScopedAnalyticsParams(
        { role: "REQUESTER", userId: "requester-1" },
        { status: "OPEN" },
      ),
    ).toEqual({ status: "OPEN", requesterId: "requester-1" });

    expect(
      buildRoleScopedTicketParams(
        { role: "REQUESTER", userId: "requester-1" },
        { page: 1, limit: 6 },
      ),
    ).toEqual({ page: 1, limit: 6, requesterId: "requester-1" });

    expect(
      buildRoleScopedAnalyticsParams(
        { role: "AGENT", userId: "agent-1" },
        { status: "OPEN" },
      ),
    ).toEqual({ status: "OPEN" });
  });

  it("distinguishes loading, API errors, unavailable data, and a loaded zero", () => {
    expect(
      dashboardDataState({ isLoading: true, isError: false, data: undefined }),
    ).toBe("loading");
    expect(
      dashboardDataState({ isLoading: false, isError: true, data: undefined }),
    ).toBe("error");
    expect(
      dashboardDataState({ isLoading: false, isError: false, data: undefined }),
    ).toBe("unavailable");
    expect(
      dashboardDataState({ isLoading: false, isError: false, data: 0 }),
    ).toBe("ready");
  });

  it("surfaces analytics API failure instead of silently returning a zero metric", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ message: "Analytics temporarily unavailable" }),
        {
          status: 503,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      getAnalyticsDashboard("org-a", {
        status: "OPEN",
        requesterId: "requester-a",
      }),
    ).rejects.toThrow("Analytics temporarily unavailable");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/reports/analytics/dashboard?status=OPEN&requesterId=requester-a",
      ),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-organization-id": "org-a" }),
        cache: "no-store",
      }),
    );
  });
});
