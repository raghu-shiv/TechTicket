import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getSlaDashboard,
  type GetSlaDashboardParams,
} from "@/lib/api/sla-dashboard";

import { slaDashboardQueryKeys } from "@/hooks/use-sla-dashboard";

import type { SlaDashboardResponse } from "@/types/sla-dashboard";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

function createDashboardResponse(
  overrides: Partial<SlaDashboardResponse> = {},
): SlaDashboardResponse {
  return {
    data: {
      metrics: {
        total: 4,
        active: 1,
        atRisk: 1,
        breached: 2,
        resolved: 1,

        firstResponse: {
          completed: 3,
          compliant: 2,
          breached: 1,
          complianceRate: 66.67,
        },

        resolution: {
          completed: 1,
          compliant: 1,
          breached: 0,
          complianceRate: 100,
        },
      },

      tickets: [
        {
          id: "ticket-1",
          ticketNumber: "SLA-0001",
          title: "VPN connection failure",

          status: "OPEN",
          priority: "HIGH",

          team: {
            id: "team-1",
            name: "IT Support",
          },

          assignee: {
            id: "user-1",
            name: "John Agent",
          },

          createdAt: "2026-10-05T10:00:00.000Z",
          resolvedAt: null,

          firstResponse: {
            dueAt: "2026-10-05T11:00:00.000Z",
            respondedAt: null,
            breachedAt: null,
          },

          resolution: {
            dueAt: "2026-10-05T14:00:00.000Z",
            breachedAt: null,
          },
        },
      ],

      ...overrides.data,
    },

    meta: {
      page: 1,
      limit: 25,
      total: 1,
      totalPages: 1,
      ...overrides.meta,
    },
  };
}

function mockSuccessfulFetch(body: SlaDashboardResponse) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
}

function mockFailedFetch(status: number, body: unknown) {
  globalThis.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: {
        "Content-Type": "application/json",
      },
    }),
  );
}

describe("SLA dashboard API client", () => {
  it("should request the organization-scoped SLA dashboard endpoint", async () => {
    const body = createDashboardResponse();

    mockSuccessfulFetch(body);

    const response = await getSlaDashboard("organization-1");

    expect(response).toEqual(body);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [url, options] = vi.mocked(globalThis.fetch).mock.calls[0];

    expect(String(url)).toBe(
      "http://localhost:4000/api/v1/reports/sla/dashboard",
    );

    expect(options).toEqual(
      expect.objectContaining({
        method: "GET",
        credentials: "include",
        cache: "no-store",

        headers: expect.objectContaining({
          Accept: "application/json",
          "x-organization-id": "organization-1",
        }),
      }),
    );
  });

  it("should serialize supported dashboard query parameters", async () => {
    const body = createDashboardResponse();

    mockSuccessfulFetch(body);

    const params: GetSlaDashboardParams = {
      view: "BREACHED",
      page: 2,
      limit: 10,
      priority: "HIGH",
      teamId: "team-123",
      createdFrom: "2026-10-01T00:00:00.000Z",
      createdTo: "2026-10-05T23:59:59.000Z",
    };

    await getSlaDashboard("organization-1", params);

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];

    const parsedUrl = new URL(String(url));

    expect(parsedUrl.pathname).toBe("/api/v1/reports/sla/dashboard");

    expect(parsedUrl.searchParams.get("view")).toBe("BREACHED");
    expect(parsedUrl.searchParams.get("page")).toBe("2");
    expect(parsedUrl.searchParams.get("limit")).toBe("10");
    expect(parsedUrl.searchParams.get("priority")).toBe("HIGH");
    expect(parsedUrl.searchParams.get("teamId")).toBe("team-123");
    expect(parsedUrl.searchParams.get("createdFrom")).toBe(
      "2026-10-01T00:00:00.000Z",
    );
    expect(parsedUrl.searchParams.get("createdTo")).toBe(
      "2026-10-05T23:59:59.000Z",
    );
  });

  it("should omit empty query parameters", async () => {
    mockSuccessfulFetch(createDashboardResponse());

    await getSlaDashboard("organization-1", {
      view: "ALL",
      page: undefined,
      limit: undefined,
      priority: "",
      teamId: undefined,
      createdFrom: "",
      createdTo: undefined,
    });

    const [url] = vi.mocked(globalThis.fetch).mock.calls[0];

    const parsedUrl = new URL(String(url));

    expect(parsedUrl.searchParams.get("view")).toBe("ALL");

    expect(parsedUrl.searchParams.has("page")).toBe(false);
    expect(parsedUrl.searchParams.has("limit")).toBe(false);
    expect(parsedUrl.searchParams.has("priority")).toBe(false);
    expect(parsedUrl.searchParams.has("teamId")).toBe(false);
    expect(parsedUrl.searchParams.has("createdFrom")).toBe(false);
    expect(parsedUrl.searchParams.has("createdTo")).toBe(false);
  });

  it("should preserve the complete better-response-shape contract", async () => {
    const body = createDashboardResponse();

    mockSuccessfulFetch(body);

    const response = await getSlaDashboard("organization-1");

    expect(response.data.metrics).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        active: expect.any(Number),
        atRisk: expect.any(Number),
        breached: expect.any(Number),
        resolved: expect.any(Number),

        firstResponse: expect.objectContaining({
          completed: expect.any(Number),
          compliant: expect.any(Number),
          breached: expect.any(Number),
          complianceRate: expect.any(Number),
        }),

        resolution: expect.objectContaining({
          completed: expect.any(Number),
          compliant: expect.any(Number),
          breached: expect.any(Number),
          complianceRate: expect.any(Number),
        }),
      }),
    );

    expect(response.data.tickets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          ticketNumber: expect.any(String),
          title: expect.any(String),
          status: expect.any(String),
          priority: expect.any(String),

          firstResponse: expect.objectContaining({
            dueAt: expect.any(String),
          }),

          resolution: expect.objectContaining({
            dueAt: expect.any(String),
          }),
        }),
      ]),
    );

    expect(response.meta).toEqual(
      expect.objectContaining({
        page: expect.any(Number),
        limit: expect.any(Number),
        total: expect.any(Number),
        totalPages: expect.any(Number),
      }),
    );
  });

  it("should preserve nullable compliance rates", async () => {
    const body = createDashboardResponse();

    body.data.metrics.firstResponse.complianceRate = null;
    body.data.metrics.resolution.complianceRate = null;

    mockSuccessfulFetch(body);

    const response = await getSlaDashboard("organization-1");

    expect(response.data.metrics.firstResponse.complianceRate).toBeNull();
    expect(response.data.metrics.resolution.complianceRate).toBeNull();
  });

  it("should preserve nullable team and assignee values", async () => {
    const body = createDashboardResponse();

    body.data.tickets[0].team = null;
    body.data.tickets[0].assignee = null;

    mockSuccessfulFetch(body);

    const response = await getSlaDashboard("organization-1");

    expect(response.data.tickets[0].team).toBeNull();
    expect(response.data.tickets[0].assignee).toBeNull();
  });

  it("should preserve nullable response and resolution timestamps", async () => {
    const body = createDashboardResponse();

    body.data.tickets[0].firstResponse.respondedAt = null;
    body.data.tickets[0].firstResponse.breachedAt = null;
    body.data.tickets[0].resolution.breachedAt = null;
    body.data.tickets[0].resolvedAt = null;

    mockSuccessfulFetch(body);

    const response = await getSlaDashboard("organization-1");

    expect(response.data.tickets[0].firstResponse.respondedAt).toBeNull();
    expect(response.data.tickets[0].firstResponse.breachedAt).toBeNull();
    expect(response.data.tickets[0].resolution.breachedAt).toBeNull();
    expect(response.data.tickets[0].resolvedAt).toBeNull();
  });

  it("should surface a server error message when the API returns a string message", async () => {
    mockFailedFetch(500, {
      message: "SLA dashboard unavailable",
    });

    await expect(getSlaDashboard("organization-1")).rejects.toThrow(
      "SLA dashboard unavailable",
    );
  });

  it("should join validation messages when the API returns an array", async () => {
    mockFailedFetch(400, {
      message: ["page must be a number", "limit must be a number"],
    });

    await expect(getSlaDashboard("organization-1")).rejects.toThrow(
      "page must be a number, limit must be a number",
    );
  });

  it("should use the fallback error when the response has no message", async () => {
    mockFailedFetch(500, {
      error: "Internal Server Error",
    });

    await expect(getSlaDashboard("organization-1")).rejects.toThrow(
      "Failed to fetch SLA dashboard",
    );
  });

  it("should use the fallback error when the error response is not JSON", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("not json", {
        status: 500,
        headers: {
          "Content-Type": "text/plain",
        },
      }),
    );

    await expect(getSlaDashboard("organization-1")).rejects.toThrow(
      "Failed to fetch SLA dashboard",
    );
  });
});

describe("SLA dashboard query keys", () => {
  it("should create a stable root query key", () => {
    expect(slaDashboardQueryKeys.all).toEqual(["sla-dashboard"]);
  });

  it("should include organization id and dashboard parameters in the query key", () => {
    const params: GetSlaDashboardParams = {
      view: "BREACHED",
      page: 2,
      limit: 10,
      priority: "HIGH",
    };

    expect(slaDashboardQueryKeys.dashboard("organization-123", params)).toEqual(
      ["sla-dashboard", "organization-123", params],
    );
  });

  it("should produce different query keys for different organizations", () => {
    const params: GetSlaDashboardParams = {
      view: "ALL",
    };

    const organizationOne = slaDashboardQueryKeys.dashboard(
      "organization-1",
      params,
    );

    const organizationTwo = slaDashboardQueryKeys.dashboard(
      "organization-2",
      params,
    );

    expect(organizationOne).not.toEqual(organizationTwo);
  });

  it("should produce different query keys for different dashboard views", () => {
    const all = slaDashboardQueryKeys.dashboard("organization-1", {
      view: "ALL",
    });

    const breached = slaDashboardQueryKeys.dashboard("organization-1", {
      view: "BREACHED",
    });

    expect(all).not.toEqual(breached);
  });

  it("should keep pagination parameters in the query key", () => {
    const pageOne = slaDashboardQueryKeys.dashboard("organization-1", {
      view: "ALL",
      page: 1,
      limit: 25,
    });

    const pageTwo = slaDashboardQueryKeys.dashboard("organization-1", {
      view: "ALL",
      page: 2,
      limit: 25,
    });

    expect(pageOne).not.toEqual(pageTwo);
  });
});
