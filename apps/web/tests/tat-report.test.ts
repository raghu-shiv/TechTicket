import { afterEach, describe, expect, it, vi } from "vitest";

import { getTatReport, type GetTatReportParams } from "@/lib/api/tat-report";

import type { TatReportResponse } from "@/types/tat-report";

const firstResponseMetric = {
  sampleSize: 3,
  averageMinutes: 20,
  medianMinutes: 20,
  p75Minutes: 25,
  p90Minutes: 28,
  p95Minutes: 29,
};

const resolutionMetric = {
  sampleSize: 3,
  averageMinutes: 120,
  medianMinutes: 120,
  p75Minutes: 150,
  p90Minutes: 168,
  p95Minutes: 174,
};

const mockTatResponse: TatReportResponse = {
  data: {
    summary: {
      ticketCount: 4,
      resolvedTicketCount: 3,
      firstResponse: firstResponseMetric,
      resolution: resolutionMetric,
    },

    trend: [
      {
        date: "2026-10-01T00:00:00.000Z",
        createdTickets: 3,
        firstResponse: firstResponseMetric,
        resolution: resolutionMetric,
      },
    ],

    byPriority: [
      {
        key: "HIGH",
        label: "HIGH",
        resolvedTickets: 2,
        firstResponse: firstResponseMetric,
        resolution: resolutionMetric,
      },
    ],

    byTeam: [
      {
        id: "team-1",
        key: "team-1",
        label: "Support",
        resolvedTickets: 2,
        firstResponse: firstResponseMetric,
        resolution: resolutionMetric,
      },
      {
        id: null,
        key: "__UNASSIGNED__",
        label: "Unassigned",
        resolvedTickets: 1,
        firstResponse: {
          sampleSize: 1,
          averageMinutes: 30,
          medianMinutes: 30,
          p75Minutes: 30,
          p90Minutes: 30,
          p95Minutes: 30,
        },
        resolution: {
          sampleSize: 1,
          averageMinutes: 180,
          medianMinutes: 180,
          p75Minutes: 180,
          p90Minutes: 180,
          p95Minutes: 180,
        },
      },
    ],

    byAssignee: [
      {
        id: "user-1",
        key: "user-1",
        label: "Test Agent",
        resolvedTickets: 2,
        firstResponse: firstResponseMetric,
        resolution: resolutionMetric,
      },
    ],

    byProduct: [
      {
        id: "product-1",
        key: "product-1",
        label: "Payments",
        resolvedTickets: 2,
        firstResponse: firstResponseMetric,
        resolution: resolutionMetric,
      },
      {
        id: null,
        key: "__UNASSIGNED__",
        label: "Unclassified",
        resolvedTickets: 1,
        firstResponse: firstResponseMetric,
        resolution: resolutionMetric,
      },
    ],

    resolvedTickets: [
      {
        id: "ticket-1",
        ticketNumber: "TAT-0001",
        title: "Payment failure",
        status: "RESOLVED",
        priority: "HIGH",
        createdAt: "2026-10-01T10:00:00.000Z",
        firstRespondedAt: "2026-10-01T10:20:00.000Z",
        resolvedAt: "2026-10-01T12:00:00.000Z",
        resolutionMinutes: 120,
        team: {
          id: "team-1",
          name: "Support",
        },
        assignee: {
          id: "user-1",
          name: "Test Agent",
        },
        product: {
          id: "product-1",
          name: "Payments",
        },
      },
    ],
  },

  meta: {
    pagination: {
      page: 1,
      limit: 25,
      total: 3,
      totalPages: 1,
    },

    query: {
      dateField: "createdAt",
      dateFrom: "2026-10-01T00:00:00.000Z",
      dateTo: "2026-10-31T23:59:59.999Z",
      priority: null,
      status: "RESOLVED",
      type: null,
      teamId: null,
      assigneeId: null,
      requesterId: null,
      productId: null,
      unassigned: null,
      unassignedTeam: null,
      organizationScoped: true,
      queryVersion: 1,
      durationUnit: "minutes",
      trendCohort: "createdAt",
    },
  },
};

function jsonResponse(
  body: unknown,
  options: { ok?: boolean; status?: number } = {},
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function mockFetchResponse(
  body: unknown,
  options: { ok?: boolean; status?: number } = {},
) {
  const fetchMock = vi
    .fn<typeof fetch>()
    .mockResolvedValue(jsonResponse(body, options));

  vi.stubGlobal("fetch", fetchMock);

  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TAT report response contract", () => {
  it("contains the summary, trend, dimensions, drill-down, and metadata", () => {
    expect(mockTatResponse.data.summary.ticketCount).toBe(4);
    expect(mockTatResponse.data.summary.resolvedTicketCount).toBe(3);

    expect(mockTatResponse.data.trend).toHaveLength(1);
    expect(mockTatResponse.data.byPriority).toHaveLength(1);
    expect(mockTatResponse.data.byTeam).toHaveLength(2);
    expect(mockTatResponse.data.byAssignee).toHaveLength(1);
    expect(mockTatResponse.data.byProduct).toHaveLength(2);
    expect(mockTatResponse.data.resolvedTickets).toHaveLength(1);

    expect(mockTatResponse.meta.query.organizationScoped).toBe(true);
    expect(mockTatResponse.meta.query.durationUnit).toBe("minutes");
    expect(mockTatResponse.meta.query.trendCohort).toBe("createdAt");
  });

  it("represents actual elapsed durations independently of SLA targets", () => {
    expect(mockTatResponse.data.summary.firstResponse.averageMinutes).toBe(20);
    expect(mockTatResponse.data.summary.resolution.averageMinutes).toBe(120);

    // TAT response metrics have no SLA target or compliance fields.
    expect(mockTatResponse.data.summary.firstResponse).not.toHaveProperty(
      "targetMinutes",
    );
    expect(mockTatResponse.data.summary.resolution).not.toHaveProperty(
      "targetMinutes",
    );
    expect(mockTatResponse.data.summary).not.toHaveProperty("complianceRate");
  });

  it("supports null metrics when there are no valid durations", () => {
    const emptyMetric = {
      sampleSize: 0,
      averageMinutes: null,
      medianMinutes: null,
      p75Minutes: null,
      p90Minutes: null,
      p95Minutes: null,
    };

    expect(emptyMetric.sampleSize).toBe(0);
    expect(emptyMetric.averageMinutes).toBeNull();
    expect(emptyMetric.medianMinutes).toBeNull();
    expect(emptyMetric.p75Minutes).toBeNull();
    expect(emptyMetric.p90Minutes).toBeNull();
    expect(emptyMetric.p95Minutes).toBeNull();
  });

  it("supports unassigned and unclassified dimension buckets", () => {
    expect(
      mockTatResponse.data.byTeam.find((row) => row.id === null)?.label,
    ).toBe("Unassigned");

    expect(
      mockTatResponse.data.byProduct.find((row) => row.id === null)?.label,
    ).toBe("Unclassified");
  });

  it("includes actual timestamps and resolution duration in ticket drill-down rows", () => {
    const ticket = mockTatResponse.data.resolvedTickets[0];

    expect(ticket.createdAt).toBe("2026-10-01T10:00:00.000Z");
    expect(ticket.firstRespondedAt).toBe("2026-10-01T10:20:00.000Z");
    expect(ticket.resolvedAt).toBe("2026-10-01T12:00:00.000Z");
    expect(ticket.resolutionMinutes).toBe(120);
  });

  it("preserves pagination metadata for resolved-ticket drill-down", () => {
    expect(mockTatResponse.meta.pagination).toEqual({
      page: 1,
      limit: 25,
      total: 3,
      totalPages: 1,
    });
  });
});

describe("getTatReport API client", () => {
  it("requests the TAT endpoint and returns the response payload", async () => {
    const fetchMock = mockFetchResponse(mockTatResponse);

    const result = await getTatReport("organization-123");

    expect(result).toEqual(mockTatResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [requestedUrl, requestOptions] = fetchMock.mock.calls[0]!;
    const url = new URL(String(requestedUrl));

    expect(url.pathname).toBe("/api/v1/reports/analytics/tat");

    expect(requestOptions).toEqual(
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "x-organization-id": "organization-123",
        },
      }),
    );
  });

  it("serializes date, ticket dimensions, assignment, and pagination filters", async () => {
    const fetchMock = mockFetchResponse(mockTatResponse);

    const params: GetTatReportParams = {
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-31T23:59:59.999Z",
      dateField: "createdAt",
      priority: "HIGH",
      status: "RESOLVED",
      type: "INCIDENT",
      teamId: "team-1",
      assigneeId: "user-1",
      requesterId: "requester-1",
      productId: "product-1",
      unassigned: false,
      unassignedTeam: true,
      page: 2,
      limit: 10,
    };

    await getTatReport("organization-123", params);

    const [requestedUrl] = fetchMock.mock.calls[0]!;
    const url = new URL(String(requestedUrl));

    expect(url.searchParams.get("from")).toBe("2026-10-01T00:00:00.000Z");
    expect(url.searchParams.get("to")).toBe("2026-10-31T23:59:59.999Z");
    expect(url.searchParams.get("dateField")).toBe("createdAt");
    expect(url.searchParams.get("priority")).toBe("HIGH");
    expect(url.searchParams.get("status")).toBe("RESOLVED");
    expect(url.searchParams.get("type")).toBe("INCIDENT");
    expect(url.searchParams.get("teamId")).toBe("team-1");
    expect(url.searchParams.get("assigneeId")).toBe("user-1");
    expect(url.searchParams.get("requesterId")).toBe("requester-1");
    expect(url.searchParams.get("productId")).toBe("product-1");
    expect(url.searchParams.get("unassigned")).toBe("false");
    expect(url.searchParams.get("unassignedTeam")).toBe("true");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("10");
  });

  it("omits empty or undefined parameters", async () => {
    const fetchMock = mockFetchResponse(mockTatResponse);

    await getTatReport("organization-123", {
      from: "",
      to: undefined,
      priority: "",
      status: undefined,
      productId: "",
      page: 1,
      limit: 25,
    });

    const [requestedUrl] = fetchMock.mock.calls[0]!;
    const url = new URL(String(requestedUrl));

    expect(url.searchParams.has("from")).toBe(false);
    expect(url.searchParams.has("to")).toBe(false);
    expect(url.searchParams.has("priority")).toBe(false);
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.has("productId")).toBe(false);

    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("25");
  });

  it("uses the selected organization ID in the request header", async () => {
    const fetchMock = mockFetchResponse(mockTatResponse);

    await getTatReport("another-organization");

    const [, requestOptions] = fetchMock.mock.calls[0]!;

    expect(requestOptions?.headers).toEqual({
      Accept: "application/json",
      "x-organization-id": "another-organization",
    });
  });

  it("throws the API message when the response contains a string message", async () => {
    mockFetchResponse(
      { message: "TAT report unavailable" },
      { ok: false, status: 500 },
    );

    await expect(getTatReport("organization-123")).rejects.toThrow(
      "TAT report unavailable",
    );
  });

  it("joins API validation messages when the response contains an array", async () => {
    mockFetchResponse(
      {
        message: ["from cannot be later than to", "Invalid date range"],
      },
      { ok: false, status: 400 },
    );

    await expect(getTatReport("organization-123")).rejects.toThrow(
      "from cannot be later than to, Invalid date range",
    );
  });

  it("uses a fallback error when the error response cannot be parsed", async () => {
    const response = {
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as unknown as Response;

    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTatReport("organization-123")).rejects.toThrow(
      "Failed to fetch TAT report",
    );
  });
});
