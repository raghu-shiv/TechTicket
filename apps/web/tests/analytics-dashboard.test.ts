import { describe, expect, it } from "vitest";

import type { AnalyticsDashboardResponse } from "@/types/analytics-dashboard";

const mockDashboardResponse: AnalyticsDashboardResponse = {
  data: {
    metrics: {
      total: 42,
      active: 18,
      resolvedClosed: 24,
      unassigned: 5,

      sla: {
        tracked: 30,
        breached: 6,
        compliant: 24,
        complianceRate: 80,

        firstResponse: {
          completed: 28,
          compliant: 24,
          breached: 4,
          complianceRate: 85.71,
        },

        resolution: {
          completed: 24,
          compliant: 21,
          breached: 3,
          complianceRate: 87.5,
        },
      },

      tat: {
        resolved: 24,
        averageResolutionMinutes: 180,
        medianResolutionMinutes: 150,
      },
    },

    volumeTrend: [
      {
        date: "2026-10-01T00:00:00.000Z",
        count: 10,
      },
      {
        date: "2026-10-02T00:00:00.000Z",
        count: 14,
      },
      {
        date: "2026-10-03T00:00:00.000Z",
        count: 18,
      },
    ],

    priorityDistribution: [
      {
        key: "LOW",
        label: "LOW",
        count: 8,
        percentage: 19.05,
      },
      {
        key: "MEDIUM",
        label: "MEDIUM",
        count: 16,
        percentage: 38.1,
      },
      {
        key: "HIGH",
        label: "HIGH",
        count: 12,
        percentage: 28.57,
      },
      {
        key: "URGENT",
        label: "URGENT",
        count: 6,
        percentage: 14.29,
      },
    ],

    teamWorkload: [
      {
        id: "team-1",
        name: "Support",
        count: 20,
      },
      {
        id: "team-2",
        name: "Engineering",
        count: 14,
      },
      {
        id: "team-3",
        name: "Operations",
        count: 8,
      },
    ],

    assigneeWorkload: [
      {
        id: "user-1",
        name: "John Doe",
        count: 12,
      },
      {
        id: "user-2",
        name: "Jane Doe",
        count: 8,
      },
      {
        id: null,
        name: "Unassigned",
        count: 5,
      },
    ],
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

describe("Analytics dashboard response", () => {
  it("contains the expected top-level response structure", () => {
    expect(mockDashboardResponse).toHaveProperty("data");
    expect(mockDashboardResponse).toHaveProperty("meta");
  });

  it("contains the expected ticket metrics", () => {
    const { metrics } = mockDashboardResponse.data;

    expect(metrics.total).toBe(42);
    expect(metrics.active).toBe(18);
    expect(metrics.resolvedClosed).toBe(24);
    expect(metrics.unassigned).toBe(5);
  });

  it("keeps ticket metric totals internally consistent", () => {
    const { metrics } = mockDashboardResponse.data;

    expect(metrics.active + metrics.resolvedClosed).toBe(metrics.total);
  });

  it("contains SLA metrics", () => {
    const { sla } = mockDashboardResponse.data.metrics;

    expect(sla.tracked).toBe(30);
    expect(sla.breached).toBe(6);
    expect(sla.compliant).toBe(24);
    expect(sla.complianceRate).toBe(80);
  });

  it("keeps SLA compliance metrics internally consistent", () => {
    const { sla } = mockDashboardResponse.data.metrics;

    expect(sla.compliant + sla.breached).toBe(sla.tracked);
    expect(sla.complianceRate).toBe((sla.compliant / sla.tracked) * 100);
  });

  it("contains first-response SLA metrics", () => {
    const { firstResponse } = mockDashboardResponse.data.metrics.sla;

    expect(firstResponse.completed).toBe(28);
    expect(firstResponse.compliant).toBe(24);
    expect(firstResponse.breached).toBe(4);
    expect(firstResponse.complianceRate).toBe(85.71);
  });

  it("keeps first-response SLA metrics internally consistent", () => {
    const { firstResponse } = mockDashboardResponse.data.metrics.sla;

    expect(firstResponse.compliant + firstResponse.breached).toBe(
      firstResponse.completed,
    );
  });

  it("contains resolution SLA metrics", () => {
    const { resolution } = mockDashboardResponse.data.metrics.sla;

    expect(resolution.completed).toBe(24);
    expect(resolution.compliant).toBe(21);
    expect(resolution.breached).toBe(3);
    expect(resolution.complianceRate).toBe(87.5);
  });

  it("keeps resolution SLA metrics internally consistent", () => {
    const { resolution } = mockDashboardResponse.data.metrics.sla;

    expect(resolution.compliant + resolution.breached).toBe(
      resolution.completed,
    );
  });

  it("contains TAT metrics", () => {
    const { tat } = mockDashboardResponse.data.metrics;

    expect(tat.resolved).toBe(24);
    expect(tat.averageResolutionMinutes).toBe(180);
    expect(tat.medianResolutionMinutes).toBe(150);
  });

  it("contains ticket volume trend data", () => {
    const { volumeTrend } = mockDashboardResponse.data;

    expect(volumeTrend).toHaveLength(3);

    expect(volumeTrend.map((item) => item.count)).toEqual([10, 14, 18]);
  });

  it("contains priority distribution data", () => {
    const { priorityDistribution } = mockDashboardResponse.data;

    expect(priorityDistribution).toHaveLength(4);

    expect(priorityDistribution.map((item) => item.key)).toEqual([
      "LOW",
      "MEDIUM",
      "HIGH",
      "URGENT",
    ]);
  });

  it("keeps priority distribution totals consistent with total tickets", () => {
    const { priorityDistribution, metrics } = mockDashboardResponse.data;

    const total = priorityDistribution.reduce(
      (sum, item) => sum + item.count,
      0,
    );

    expect(total).toBe(metrics.total);
  });

  it("contains team workload data", () => {
    const { teamWorkload } = mockDashboardResponse.data;

    expect(teamWorkload).toHaveLength(3);

    expect(teamWorkload.map((team) => team.name)).toEqual([
      "Support",
      "Engineering",
      "Operations",
    ]);
  });

  it("keeps team workload totals consistent with total tickets", () => {
    const { teamWorkload, metrics } = mockDashboardResponse.data;

    const total = teamWorkload.reduce((sum, team) => sum + team.count, 0);

    expect(total).toBe(metrics.total);
  });

  it("contains assignee workload data", () => {
    const { assigneeWorkload } = mockDashboardResponse.data;

    expect(assigneeWorkload).toHaveLength(3);

    expect(assigneeWorkload.map((assignee) => assignee.name)).toEqual([
      "John Doe",
      "Jane Doe",
      "Unassigned",
    ]);
  });

  it("represents unassigned workload with a null assignee id", () => {
    const { assigneeWorkload } = mockDashboardResponse.data;

    const unassigned = assigneeWorkload.find(
      (assignee) => assignee.name === "Unassigned",
    );

    expect(unassigned).toBeDefined();
    expect(unassigned?.id).toBeNull();
    expect(unassigned?.count).toBe(5);
  });

  it("identifies the response as organization scoped", () => {
    expect(mockDashboardResponse.meta.query.organizationScoped).toBe(true);
  });

  it("uses createdAt as the default dashboard date field", () => {
    expect(mockDashboardResponse.meta.query.dateField).toBe("createdAt");
  });

  it("supports an unfiltered dashboard query", () => {
    expect(mockDashboardResponse.meta.query.dateFrom).toBeNull();
    expect(mockDashboardResponse.meta.query.dateTo).toBeNull();
  });

  it("contains the expected analytics query version", () => {
    expect(mockDashboardResponse.meta.query.queryVersion).toBe(1);
  });

  it("supports an empty dashboard response", () => {
    const emptyResponse: AnalyticsDashboardResponse = {
      ...mockDashboardResponse,

      data: {
        ...mockDashboardResponse.data,

        metrics: {
          total: 0,
          active: 0,
          resolvedClosed: 0,
          unassigned: 0,

          sla: {
            tracked: 0,
            breached: 0,
            compliant: 0,
            complianceRate: null,

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
        priorityDistribution: [],
        teamWorkload: [],
        assigneeWorkload: [],
      },
    };

    expect(emptyResponse.data.metrics.total).toBe(0);
    expect(emptyResponse.data.metrics.active).toBe(0);
    expect(emptyResponse.data.metrics.resolvedClosed).toBe(0);
    expect(emptyResponse.data.metrics.unassigned).toBe(0);

    expect(emptyResponse.data.volumeTrend).toEqual([]);
    expect(emptyResponse.data.priorityDistribution).toEqual([]);
    expect(emptyResponse.data.teamWorkload).toEqual([]);
    expect(emptyResponse.data.assigneeWorkload).toEqual([]);

    expect(emptyResponse.data.metrics.sla.complianceRate).toBeNull();

    expect(emptyResponse.data.metrics.tat.averageResolutionMinutes).toBeNull();

    expect(emptyResponse.data.metrics.tat.medianResolutionMinutes).toBeNull();
  });
});
