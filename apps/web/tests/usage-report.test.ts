import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchUsageReport } from "@/components/reports/UsageReport";

import type { UsageReportResponse } from "@/components/reports/UsageReport";

const mockUsageResponse: UsageReportResponse = {
  summary: {
    ticketsCreated: 12,
    activitiesRecorded: 28,
    commentsCreated: 7,
    attachmentsUploaded: 3,
    approvalRequests: 4,
    approvalsApproved: 2,
    approvalsRejected: 1,
    activeUsers: 5,
    activeAgents: 3,
  },

  trends: [
    {
      date: "2026-10-01",
      ticketsCreated: 4,
      activitiesRecorded: 10,
      commentsCreated: 3,
      attachmentsUploaded: 1,
      approvalRequests: 2,
    },
    {
      date: "2026-10-02",
      ticketsCreated: 8,
      activitiesRecorded: 18,
      commentsCreated: 4,
      attachmentsUploaded: 2,
      approvalRequests: 2,
    },
  ],

  period: {
    from: "2026-10-01",
    to: "2026-10-02",
  },

  metricAvailability: {
    notifications: "unavailable",
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

describe("Usage report response contract", () => {
  it("contains the summary, trends, period, and metric availability", () => {
    expect(mockUsageResponse.summary).toEqual({
      ticketsCreated: 12,
      activitiesRecorded: 28,
      commentsCreated: 7,
      attachmentsUploaded: 3,
      approvalRequests: 4,
      approvalsApproved: 2,
      approvalsRejected: 1,
      activeUsers: 5,
      activeAgents: 3,
    });

    expect(mockUsageResponse.trends).toHaveLength(2);
    expect(mockUsageResponse.period.from).toBe("2026-10-01");
    expect(mockUsageResponse.period.to).toBe("2026-10-02");
    expect(mockUsageResponse.metricAvailability.notifications).toBe(
      "unavailable",
    );
  });

  it("uses non-negative integer counts for summary metrics", () => {
    for (const value of Object.values(mockUsageResponse.summary)) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });

  it("uses non-negative integer counts for trend metrics", () => {
    for (const point of mockUsageResponse.trends) {
      for (const value of [
        point.ticketsCreated,
        point.activitiesRecorded,
        point.commentsCreated,
        point.attachmentsUploaded,
        point.approvalRequests,
      ]) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("supports an empty report without fabricated counts", () => {
    const emptyResponse: UsageReportResponse = {
      summary: {
        ticketsCreated: 0,
        activitiesRecorded: 0,
        commentsCreated: 0,
        attachmentsUploaded: 0,
        approvalRequests: 0,
        approvalsApproved: 0,
        approvalsRejected: 0,
        activeUsers: 0,
        activeAgents: 0,
      },
      trends: [],
      period: {
        from: "2020-01-01",
        to: "2020-01-07",
      },
      metricAvailability: {
        notifications: "unavailable",
      },
    };

    expect(Object.values(emptyResponse.summary)).toEqual(Array(9).fill(0));
    expect(emptyResponse.trends).toEqual([]);
    expect(emptyResponse.metricAvailability.notifications).toBe("unavailable");
  });
});

describe("fetchUsageReport", () => {
  it("requests the usage endpoint with the organization header", async () => {
    const fetchMock = mockFetchResponse(mockUsageResponse);

    const result = await fetchUsageReport("org-123");

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, options] = fetchMock.mock.calls[0];

    expect(String(url)).toContain("/reports/analytics/usage");
    expect(options).toEqual(
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "x-organization-id": "org-123",
        },
      }),
    );

    expect(result).toEqual(mockUsageResponse);
  });

  it("passes the selected from and to dates as query parameters", async () => {
    const fetchMock = mockFetchResponse(mockUsageResponse);

    await fetchUsageReport("org-123", {
      from: "2026-10-01",
      to: "2026-10-31",
    });

    const [url] = fetchMock.mock.calls[0];
    const parsedUrl = new URL(String(url));

    expect(parsedUrl.searchParams.get("from")).toBe("2026-10-01");
    expect(parsedUrl.searchParams.get("to")).toBe("2026-10-31");
  });

  it("omits unset date parameters", async () => {
    const fetchMock = mockFetchResponse(mockUsageResponse);

    await fetchUsageReport("org-123", {
      from: "",
      to: undefined,
    });

    const [url] = fetchMock.mock.calls[0];
    const parsedUrl = new URL(String(url));

    expect(parsedUrl.searchParams.has("from")).toBe(false);
    expect(parsedUrl.searchParams.has("to")).toBe(false);
  });

  it("throws the API error message when the server returns a string message", async () => {
    mockFetchResponse(
      { message: "Organization access denied" },
      { ok: false, status: 403 },
    );

    await expect(fetchUsageReport("org-123")).rejects.toThrow(
      "Organization access denied",
    );
  });

  it("joins API validation messages when the server returns an array", async () => {
    mockFetchResponse(
      { message: ["Invalid from date", "Invalid to date"] },
      { ok: false, status: 400 },
    );

    await expect(fetchUsageReport("org-123")).rejects.toThrow(
      "Invalid from date, Invalid to date",
    );
  });

  it("uses a fallback error when the error response is not JSON", async () => {
    const response = {
      ok: false,
      status: 500,
      json: vi.fn().mockRejectedValue(new Error("Invalid JSON")),
    } as unknown as Response;

    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(response));

    await expect(fetchUsageReport("org-123")).rejects.toThrow(
      "Failed to fetch usage report",
    );
  });

  it("propagates network errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>().mockRejectedValue(new Error("Network unavailable")),
    );

    await expect(fetchUsageReport("org-123")).rejects.toThrow(
      "Network unavailable",
    );
  });
});
