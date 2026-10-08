import { describe, expect, it } from "vitest";

import {
  buildSlaDrillDownUrl,
  getAtRiskRate,
  getBreachRate,
} from "@/components/reports/SlaBreachAnalysis";

import type { SlaBreachAnalysis, SlaReportResponse } from "@/types/sla-report";

const mockBreachAnalysis: SlaBreachAnalysis = {
  summary: {
    tracked: 100,
    breached: 20,
    breachRate: 20,
    atRisk: 10,
    atRiskRate: 10,
  },

  firstResponse: {
    breached: 12,
    breachRate: 12,
  },

  resolution: {
    breached: 8,
    breachRate: 10,
  },

  trend: [
    {
      date: "2026-10-01T00:00:00.000Z",
      tracked: 50,
      breached: 8,
      breachRate: 16,
      atRisk: 5,
      atRiskRate: 10,
    },
    {
      date: "2026-10-02T00:00:00.000Z",
      tracked: 50,
      breached: 12,
      breachRate: 24,
      atRisk: 5,
      atRiskRate: 10,
    },
  ],

  dimensions: {
    priority: [
      {
        key: "URGENT",
        label: "URGENT",
        tracked: 20,
        breached: 8,
        breachRate: 40,
        atRisk: 2,
        atRiskRate: 10,
      },
      {
        key: "HIGH",
        label: "HIGH",
        tracked: 30,
        breached: 7,
        breachRate: 23.33,
        atRisk: 4,
        atRiskRate: 13.33,
      },
      {
        key: "MEDIUM",
        label: "MEDIUM",
        tracked: 30,
        breached: 4,
        breachRate: 13.33,
        atRisk: 3,
        atRiskRate: 10,
      },
      {
        key: "LOW",
        label: "LOW",
        tracked: 20,
        breached: 1,
        breachRate: 5,
        atRisk: 1,
        atRiskRate: 5,
      },
    ],

    team: [
      {
        id: "team-1",
        key: "team-1",
        label: "Support",
        tracked: 40,
        breached: 10,
        breachRate: 25,
        atRisk: 4,
        atRiskRate: 10,
      },
      {
        id: null,
        key: "__UNASSIGNED__",
        label: "Unassigned",
        tracked: 10,
        breached: 2,
        breachRate: 20,
        atRisk: 1,
        atRiskRate: 10,
      },
    ],

    assignee: [
      {
        id: "user-1",
        key: "user-1",
        label: "John Agent",
        tracked: 30,
        breached: 8,
        breachRate: 26.67,
        atRisk: 2,
        atRiskRate: 6.67,
      },
      {
        id: null,
        key: "__UNASSIGNED__",
        label: "Unassigned",
        tracked: 15,
        breached: 4,
        breachRate: 26.67,
        atRisk: 2,
        atRiskRate: 13.33,
      },
    ],
  },

  drillDown: {
    allBreached: "/reports/sla?view=BREACHED",
    atRisk: "/reports/sla?view=AT_RISK",
    firstResponseBreached: "/reports/sla?view=FIRST_RESPONSE_BREACHED",
    resolutionBreached: "/reports/sla?view=RESOLUTION_BREACHED",
  },
};

const mockSlaReportResponse: SlaReportResponse = {
  data: {
    summary: {
      totalTracked: 100,
      breached: 20,
      atRisk: 10,
      active: 70,
      resolved: 20,

      firstResponse: {
        completed: 80,
        compliant: 68,
        breached: 12,
        complianceRate: 85,
      },

      resolution: {
        completed: 80,
        compliant: 72,
        breached: 8,
        complianceRate: 90,
      },
    },

    comparison: {
      firstResponse: {
        completed: 80,
        compliant: 68,
        breached: 12,
        complianceRate: 85,
        breachRate: 15,
      },

      resolution: {
        completed: 80,
        compliant: 72,
        breached: 8,
        complianceRate: 90,
        breachRate: 10,
      },

      complianceGapPercentagePoints: -5,
      breachGapPercentagePoints: 5,
    },

    trend: [
      {
        date: "2026-10-01T00:00:00.000Z",
        tracked: 50,
        breached: 8,
        breachRate: 16,
        firstResponse: {
          completed: 40,
          compliant: 34,
          breached: 6,
          complianceRate: 85,
        },
        resolution: {
          completed: 40,
          compliant: 36,
          breached: 4,
          complianceRate: 90,
        },
      },
    ],

    byPriority: [
      {
        key: "URGENT",
        label: "URGENT",
        tracked: 20,
        breached: 8,
        breachRate: 40,
        atRisk: 2,
        active: 10,
        resolved: 8,

        firstResponse: {
          completed: 18,
          compliant: 12,
          breached: 6,
          complianceRate: 66.67,
        },

        resolution: {
          completed: 16,
          compliant: 12,
          breached: 4,
          complianceRate: 75,
        },
      },
    ],

    byTeam: [
      {
        id: "team-1",
        key: "team-1",
        label: "Support",
        tracked: 40,
        breached: 10,
        breachRate: 25,
        atRisk: 4,
        active: 26,
        resolved: 10,

        firstResponse: {
          completed: 32,
          compliant: 25,
          breached: 7,
          complianceRate: 78.13,
        },

        resolution: {
          completed: 30,
          compliant: 24,
          breached: 6,
          complianceRate: 80,
        },
      },
    ],

    byAssignee: [
      {
        id: "user-1",
        key: "user-1",
        label: "John Agent",
        tracked: 30,
        breached: 8,
        breachRate: 26.67,
        atRisk: 2,
        active: 20,
        resolved: 8,

        firstResponse: {
          completed: 25,
          compliant: 20,
          breached: 5,
          complianceRate: 80,
        },

        resolution: {
          completed: 24,
          compliant: 19,
          breached: 5,
          complianceRate: 79.17,
        },
      },
    ],

    breachAnalysis: mockBreachAnalysis,
  },

  meta: {
    query: {
      dateField: "createdAt",
      dateFrom: "2026-10-01T00:00:00.000Z",
      dateTo: "2026-10-31T23:59:59.999Z",
      organizationScoped: true,
      queryVersion: 1,
    },
  },
};

describe("SLA breach analysis", () => {
  it("contains the expected summary metrics", () => {
    const { summary } = mockBreachAnalysis;

    expect(summary.tracked).toBe(100);
    expect(summary.breached).toBe(20);
    expect(summary.breachRate).toBe(20);
    expect(summary.atRisk).toBe(10);
    expect(summary.atRiskRate).toBe(10);
  });

  it("calculates breach rate correctly", () => {
    expect(
      getBreachRate({
        tracked: 100,
        breached: 25,
      }),
    ).toBe(25);

    expect(
      getBreachRate({
        tracked: 30,
        breached: 7,
      }),
    ).toBe(23.33);
  });

  it("returns zero breach rate when no SLA tickets are tracked", () => {
    expect(
      getBreachRate({
        tracked: 0,
        breached: 0,
      }),
    ).toBe(0);
  });

  it("calculates at-risk rate correctly", () => {
    expect(
      getAtRiskRate({
        tracked: 100,
        atRisk: 15,
      }),
    ).toBe(15);

    expect(
      getAtRiskRate({
        tracked: 30,
        atRisk: 7,
      }),
    ).toBe(23.33);
  });

  it("returns zero at-risk rate when no SLA tickets are tracked", () => {
    expect(
      getAtRiskRate({
        tracked: 0,
        atRisk: 0,
      }),
    ).toBe(0);
  });

  it("contains independent first-response breach metrics", () => {
    expect(mockBreachAnalysis.firstResponse.breached).toBe(12);

    expect(mockBreachAnalysis.firstResponse.breachRate).toBe(12);
  });

  it("contains independent resolution breach metrics", () => {
    expect(mockBreachAnalysis.resolution.breached).toBe(8);

    expect(mockBreachAnalysis.resolution.breachRate).toBe(10);
  });

  it("contains breach trend data", () => {
    expect(mockBreachAnalysis.trend).toHaveLength(2);

    expect(mockBreachAnalysis.trend.map((point) => point.breached)).toEqual([
      8, 12,
    ]);

    expect(mockBreachAnalysis.trend.map((point) => point.atRisk)).toEqual([
      5, 5,
    ]);
  });

  it("contains priority breach dimensions", () => {
    expect(mockBreachAnalysis.dimensions.priority).toHaveLength(4);

    expect(
      mockBreachAnalysis.dimensions.priority.map((point) => point.key),
    ).toEqual(["URGENT", "HIGH", "MEDIUM", "LOW"]);
  });

  it("contains team breach dimensions", () => {
    expect(mockBreachAnalysis.dimensions.team).toHaveLength(2);

    expect(
      mockBreachAnalysis.dimensions.team.map((point) => point.label),
    ).toEqual(["Support", "Unassigned"]);
  });

  it("preserves the explicit unassigned team bucket", () => {
    const unassigned = mockBreachAnalysis.dimensions.team.find(
      (point) => point.key === "__UNASSIGNED__",
    );

    expect(unassigned).toBeDefined();
    expect(unassigned?.id).toBeNull();
    expect(unassigned?.label).toBe("Unassigned");
  });

  it("contains assignee breach dimensions", () => {
    expect(mockBreachAnalysis.dimensions.assignee).toHaveLength(2);

    expect(
      mockBreachAnalysis.dimensions.assignee.map((point) => point.label),
    ).toEqual(["John Agent", "Unassigned"]);
  });

  it("preserves the explicit unassigned assignee bucket", () => {
    const unassigned = mockBreachAnalysis.dimensions.assignee.find(
      (point) => point.key === "__UNASSIGNED__",
    );

    expect(unassigned).toBeDefined();
    expect(unassigned?.id).toBeNull();
    expect(unassigned?.label).toBe("Unassigned");
  });

  it("contains the existing SLA drill-down URLs", () => {
    expect(mockBreachAnalysis.drillDown.allBreached).toBe(
      "/reports/sla?view=BREACHED",
    );

    expect(mockBreachAnalysis.drillDown.atRisk).toBe(
      "/reports/sla?view=AT_RISK",
    );

    expect(mockBreachAnalysis.drillDown.firstResponseBreached).toBe(
      "/reports/sla?view=FIRST_RESPONSE_BREACHED",
    );

    expect(mockBreachAnalysis.drillDown.resolutionBreached).toBe(
      "/reports/sla?view=RESOLUTION_BREACHED",
    );
  });

  it("builds the existing SLA dashboard drill-down URLs", () => {
    expect(buildSlaDrillDownUrl("BREACHED")).toBe("/reports/sla?view=BREACHED");

    expect(buildSlaDrillDownUrl("AT_RISK")).toBe("/reports/sla?view=AT_RISK");

    expect(buildSlaDrillDownUrl("FIRST_RESPONSE_BREACHED")).toBe(
      "/reports/sla?view=FIRST_RESPONSE_BREACHED",
    );

    expect(buildSlaDrillDownUrl("RESOLUTION_BREACHED")).toBe(
      "/reports/sla?view=RESOLUTION_BREACHED",
    );
  });

  it("keeps breach dimensions internally consistent", () => {
    for (const point of [
      ...mockBreachAnalysis.dimensions.priority,
      ...mockBreachAnalysis.dimensions.team,
      ...mockBreachAnalysis.dimensions.assignee,
    ]) {
      expect(point.breached).toBeLessThanOrEqual(point.tracked);

      expect(point.atRisk).toBeLessThanOrEqual(point.tracked);

      expect(point.breachRate).toBe(
        getBreachRate({
          tracked: point.tracked,
          breached: point.breached,
        }),
      );

      expect(point.atRiskRate).toBe(
        getAtRiskRate({
          tracked: point.tracked,
          atRisk: point.atRisk,
        }),
      );
    }
  });

  it("keeps the report organization scoped", () => {
    expect(mockSlaReportResponse.meta.query.organizationScoped).toBe(true);
  });

  it("preserves the analytics query version", () => {
    expect(mockSlaReportResponse.meta.query.queryVersion).toBe(1);
  });

  it("supports an empty breach analysis", () => {
    const emptyAnalysis: SlaBreachAnalysis = {
      summary: {
        tracked: 0,
        breached: 0,
        breachRate: 0,
        atRisk: 0,
        atRiskRate: 0,
      },

      firstResponse: {
        breached: 0,
        breachRate: 0,
      },

      resolution: {
        breached: 0,
        breachRate: 0,
      },

      trend: [],

      dimensions: {
        priority: [],
        team: [],
        assignee: [],
      },

      drillDown: {
        allBreached: "/reports/sla?view=BREACHED",
        atRisk: "/reports/sla?view=AT_RISK",
        firstResponseBreached: "/reports/sla?view=FIRST_RESPONSE_BREACHED",
        resolutionBreached: "/reports/sla?view=RESOLUTION_BREACHED",
      },
    };

    expect(emptyAnalysis.summary.tracked).toBe(0);
    expect(emptyAnalysis.summary.breached).toBe(0);
    expect(emptyAnalysis.summary.breachRate).toBe(0);
    expect(emptyAnalysis.summary.atRisk).toBe(0);
    expect(emptyAnalysis.summary.atRiskRate).toBe(0);

    expect(emptyAnalysis.trend).toEqual([]);

    expect(emptyAnalysis.dimensions.priority).toEqual([]);
    expect(emptyAnalysis.dimensions.team).toEqual([]);
    expect(emptyAnalysis.dimensions.assignee).toEqual([]);
  });
});
