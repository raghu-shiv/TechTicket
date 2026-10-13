import { afterEach, describe, expect, it, vi } from "vitest";

import { getTickets } from "@/lib/api/tickets";
import { getTicketLibraryEntries } from "@/lib/api/ticket-library";
import {
  buildTicketLibrarySearchHref,
  buildTicketLibrarySearchRequest,
  buildTicketSearchHref,
  buildTicketSearchRequest,
  normalizeTicketSearchQuery,
  resolveTicketSearchViewState,
} from "@/lib/search/ticket-search";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeTicketSearchQuery", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeTicketSearchQuery("  printer issue  ")).toBe(
      "printer issue",
    );
  });

  it("collapses repeated whitespace, newlines, and tabs", () => {
    expect(normalizeTicketSearchQuery("  printer \n  issue\t timeout  ")).toBe(
      "printer issue timeout",
    );
  });

  it("preserves meaningful punctuation in ticket numbers", () => {
    expect(normalizeTicketSearchQuery(" INC-2026-0042 ")).toBe("INC-2026-0042");
  });

  it("returns an empty string for whitespace-only queries", () => {
    expect(normalizeTicketSearchQuery(" \n\t  ")).toBe("");
  });
});

describe("buildTicketSearchRequest", () => {
  it("builds the existing ticket-list query with normalized search text", () => {
    expect(buildTicketSearchRequest("org-a", "  printer   issue  ")).toEqual({
      organizationId: "org-a",
      params: {
        page: 1,
        limit: 8,
        search: "printer issue",
        sortBy: "updatedAt",
        sortOrder: "desc",
      },
    });
  });

  it("keeps the supplied organization as the request scope", () => {
    const request = buildTicketSearchRequest("org-a", "printer");

    expect(request?.organizationId).toBe("org-a");
  });

  it("does not create a request without an organization", () => {
    expect(buildTicketSearchRequest(undefined, "printer")).toBeNull();
  });

  it("does not create a request for an empty normalized query", () => {
    expect(buildTicketSearchRequest("org-a", "   ")).toBeNull();
  });
});

describe("buildTicketSearchHref", () => {
  it("preserves the normalized query for the Tickets page", () => {
    const href = buildTicketSearchHref("  INC-42   printer issue ");

    expect(href.startsWith("/tickets?")).toBe(true);

    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/tickets");
    expect(url.searchParams.get("search")).toBe("INC-42 printer issue");
  });

  it("returns the Tickets page without an empty search parameter", () => {
    expect(buildTicketSearchHref("  ")).toBe("/tickets");
  });
});

describe("resolveTicketSearchViewState", () => {
  const baseInput = {
    query: "printer",
    organizationLoading: false,
    organizationError: false,
    organizationId: "org-a" as string | undefined,
    debouncing: false,
    searchLoading: false,
    searchError: false,
    resultCount: 1,
  };

  it("shows the prompt for an empty query", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        query: "   ",
      }),
    ).toBe("prompt");
  });

  it("shows workspace loading while organization context is loading", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        organizationLoading: true,
      }),
    ).toBe("workspace-loading");
  });

  it("shows workspace error when organization loading fails", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        organizationError: true,
      }),
    ).toBe("workspace-error");
  });

  it("does not search when no organization is available", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        organizationId: undefined,
      }),
    ).toBe("no-organization");
  });

  it("shows loading while the query is being debounced", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        debouncing: true,
      }),
    ).toBe("loading");
  });

  it("shows loading while the ticket API request is in progress", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        searchLoading: true,
      }),
    ).toBe("loading");
  });

  it("shows results when tickets are returned", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        resultCount: 3,
      }),
    ).toBe("results");
  });

  it("shows the empty state when the search returns no tickets", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        resultCount: 0,
      }),
    ).toBe("empty");
  });

  it("shows an error state when the ticket API fails", () => {
    expect(
      resolveTicketSearchViewState({
        ...baseInput,
        resultCount: 0,
        searchError: true,
      }),
    ).toBe("error");
  });
});

describe("existing ticket API search contract", () => {
  it("sends search and organization scope through the existing API client", async () => {
    const responseBody = {
      data: [],
      meta: {
        page: 1,
        limit: 8,
        total: 0,
        totalPages: 0,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const request = buildTicketSearchRequest("org-a", " printer  issue ");

    expect(request).not.toBeNull();

    await getTickets(request!.organizationId, request!.params);

    const [rawUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    const url = new URL(rawUrl);
    const headers = requestInit.headers as Record<string, string>;

    expect(url.pathname).toBe("/api/v1/tickets");
    expect(url.searchParams.get("search")).toBe("printer issue");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("8");
    expect(url.searchParams.get("sortBy")).toBe("updatedAt");

    expect(headers["x-organization-id"]).toBe("org-a");
  });

  it("propagates an API error rather than converting failure into no results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: "Search service unavailable",
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTickets("org-a", {
        search: "printer",
        page: 1,
        limit: 8,
      }),
    ).rejects.toThrow("Search service unavailable");
  });
});

describe("buildTicketLibrarySearchRequest", () => {
  it("uses the existing organization-scoped article search contract", () => {
    expect(
      buildTicketLibrarySearchRequest("org-a", "  cache   reset "),
    ).toEqual({
      organizationId: "org-a",
      params: {
        search: "cache reset",
        page: 1,
        limit: 6,
      },
    });
  });

  it("does not create a request without an organization", () => {
    expect(buildTicketLibrarySearchRequest(undefined, "cache")).toBeNull();
  });

  it("does not create a request for an empty query", () => {
    expect(buildTicketLibrarySearchRequest("org-a", "  ")).toBeNull();
  });
});

describe("buildTicketLibrarySearchHref", () => {
  it("opens the existing library page with search and selected article", () => {
    const href = buildTicketLibrarySearchHref(
      "  cache   reset ",
      "article-a",
      "product-a",
    );

    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/ticket-library");
    expect(url.searchParams.get("search")).toBe("cache reset");
    expect(url.searchParams.get("selectedArticleId")).toBe("article-a");
    expect(url.searchParams.get("productId")).toBe("product-a");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.pathname).not.toMatch(/\/ticket-library\/[^/]+$/);
  });

  it("opens the existing library page without a selected article for View all", () => {
    const href = buildTicketLibrarySearchHref("cache reset");
    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/ticket-library");
    expect(url.searchParams.get("search")).toBe("cache reset");
    expect(url.searchParams.has("selectedArticleId")).toBe(false);
  });
});

describe("existing Ticket Library search API contract", () => {
  it("sends normalized search, pagination, and organization scope", async () => {
    const responseBody = {
      data: [],
      meta: {
        page: 1,
        limit: 6,
        total: 0,
        totalPages: 0,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const request = buildTicketLibrarySearchRequest(
      "org-a",
      "  cache   reset ",
    );

    expect(request).not.toBeNull();

    await getTicketLibraryEntries(request!.organizationId, request!.params);

    const [rawUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    const url = new URL(rawUrl);
    const headers = requestInit.headers as Record<string, string>;

    expect(url.pathname).toBe("/api/v1/ticket-library");
    expect(url.searchParams.get("search")).toBe("cache reset");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("6");
    expect(headers["x-organization-id"]).toBe("org-a");
  });

  it("propagates a Ticket Library API failure instead of treating it as empty", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: "Ticket Library unavailable",
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      getTicketLibraryEntries("org-a", {
        search: "cache",
        page: 1,
        limit: 6,
      }),
    ).rejects.toThrow("Ticket Library unavailable");
  });
});
