import { afterEach, describe, expect, it, vi } from "vitest";

import { searchMembers } from "@/lib/api/members";
import {
  buildMemberSearchHref,
  buildMemberSearchRequest,
} from "@/lib/search/ticket-search";
import type { MemberSearchResult } from "@/types/members";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("buildMemberSearchRequest", () => {
  it("normalizes the query and applies the result limit", () => {
    expect(buildMemberSearchRequest("org-a", "  Jordan   Smith ")).toEqual({
      organizationId: "org-a",
      params: {
        search: "Jordan Smith",
        limit: 8,
      },
    });
  });

  it("does not build a request without an organization", () => {
    expect(buildMemberSearchRequest(undefined, "Jordan")).toBeNull();
  });

  it("does not build a request for a query shorter than two characters", () => {
    expect(buildMemberSearchRequest("org-a", "J")).toBeNull();

    expect(buildMemberSearchRequest("org-a", "  ")).toBeNull();
  });

  it("does not build a request for a query longer than 100 characters", () => {
    expect(buildMemberSearchRequest("org-a", "x".repeat(101))).toBeNull();
  });
});

describe("buildMemberSearchHref", () => {
  it("preserves the normalized query and selected user ID", () => {
    const href = buildMemberSearchHref("  Jordan   Smith ", "user-123");

    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/users");
    expect(url.searchParams.get("search")).toBe("Jordan Smith");
    expect(url.searchParams.get("selectedUserId")).toBe("user-123");
  });

  it("opens the Users page without an empty search parameter", () => {
    expect(buildMemberSearchHref("   ")).toBe("/users");
  });

  it("can open the Users page with a search query but no selected user", () => {
    const href = buildMemberSearchHref("jordan@example.com");
    const url = new URL(href, "https://example.test");

    expect(url.pathname).toBe("/users");
    expect(url.searchParams.get("search")).toBe("jordan@example.com");
    expect(url.searchParams.has("selectedUserId")).toBe(false);
  });
});

describe("existing members API search contract", () => {
  it("sends the query, limit, and organization header through the API client", async () => {
    const responseBody: MemberSearchResult[] = [
      {
        id: "user-123",
        displayName: "Jordan Smith",
        email: "jordan@example.com",
      },
    ];

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const result = await searchMembers("org-a", {
      search: "Jordan Smith",
      limit: 8,
    });

    expect(result).toEqual(responseBody);

    const [rawUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    const url = new URL(rawUrl);
    const headers = requestInit.headers as Record<string, string>;

    expect(url.pathname).toBe("/api/v1/members");
    expect(url.searchParams.get("search")).toBe("Jordan Smith");
    expect(url.searchParams.get("limit")).toBe("8");
    expect(headers["x-organization-id"]).toBe("org-a");
    expect(requestInit.credentials).toBe("include");
    expect(requestInit.cache).toBe("no-store");
  });

  it("propagates an API error instead of treating failure as no results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: "You are not allowed to search organization members.",
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      searchMembers("org-a", {
        search: "Jordan",
        limit: 8,
      }),
    ).rejects.toThrow("You are not allowed to search organization members.");
  });
});
