import { afterEach, describe, expect, it, vi } from "vitest";

import { actOnApproval, getApprovalInbox } from "@/lib/api/approvals";
import {
  addMember,
  getMembers,
  removeMember,
  updateMemberRole,
} from "@/lib/api/members";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/lib/api/products";
import {
  createTicketLibraryEntry,
  deleteTicketLibraryEntry,
  getTicketLibraryEntries,
  updateTicketLibraryEntry,
} from "@/lib/api/ticket-library";

afterEach(() => vi.unstubAllGlobals());

function successResponse(body: unknown = {}) {
  return { ok: true, status: 200, json: async () => body } as Response;
}

describe("UI-2 API contracts", () => {
  it("requests the organization-scoped approval inbox and status filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await getApprovalInbox("org-1", "PENDING");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/approvals\?status=PENDING$/);
    expect(init).toMatchObject({
      method: "GET",
      credentials: "include",
      headers: { "x-organization-id": "org-1" },
    });
  });

  it("posts approval comments through the existing action endpoint", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        successResponse({ id: "approval-1", status: "APPROVED" }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await actOnApproval(
      "org-1",
      { id: "approval-1", ticketId: "ticket-1" },
      "approve",
      "Reviewed.",
    );
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/tickets\/ticket-1\/approvals\/approval-1\/approve$/);
    expect(init).toMatchObject({
      method: "PATCH",
      headers: {
        "x-organization-id": "org-1",
        "Content-Type": "application/json",
      },
    });
    expect(JSON.parse(init.body as string)).toEqual({ comment: "Reviewed." });
  });

  it("uses organization-scoped membership endpoints for management actions", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successResponse([]))
      .mockResolvedValueOnce(successResponse({ userId: "u-1" }))
      .mockResolvedValueOnce(successResponse({ userId: "u-1", role: "AGENT" }))
      .mockResolvedValueOnce(
        successResponse({
          success: true,
          userId: "u-1",
          organizationId: "org-1",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await getMembers("org-1");
    await addMember("org-1", {
      email: "existing@example.com",
      role: "REQUESTER",
    });
    await updateMemberRole("org-1", "u-1", "AGENT");
    await removeMember("org-1", "u-1");

    expect(
      fetchMock.mock.calls.map((call) => [
        (call[0] as string).split("/api/v1")[1],
        (call[1] as RequestInit).method,
      ]),
    ).toEqual([
      ["/members", "GET"],
      ["/members", "POST"],
      ["/members/u-1", "PATCH"],
      ["/members/u-1", "DELETE"],
    ]);
    for (const [, init] of fetchMock.mock.calls as unknown as Array<
      [string, RequestInit]
    >) {
      expect(
        (init.headers as Record<string, string>)["x-organization-id"],
      ).toBe("org-1");
    }
  });

  it("uses existing product CRUD endpoints", async () => {
    const product = {
      id: "product-1",
      organizationId: "org-1",
      name: "ERP",
      description: null,
      isActive: true,
      createdAt: "2026-10-01T00:00:00.000Z",
      updatedAt: "2026-10-01T00:00:00.000Z",
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successResponse([product]))
      .mockResolvedValueOnce(successResponse(product))
      .mockResolvedValueOnce(successResponse({ ...product, isActive: false }))
      .mockResolvedValueOnce(successResponse({ id: "product-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await getProducts("org-1");
    await createProduct("org-1", { name: "ERP" });
    await updateProduct("org-1", "product-1", { isActive: false });
    await deleteProduct("org-1", "product-1");

    expect(
      fetchMock.mock.calls.map((call) => [
        (call[0] as string).split("/api/v1")[1],
        (call[1] as RequestInit).method,
      ]),
    ).toEqual([
      ["/products", "GET"],
      ["/products", "POST"],
      ["/products/product-1", "PATCH"],
      ["/products/product-1", "DELETE"],
    ]);
  });

  it("filters Ticket Library articles through its dedicated knowledge endpoint", async () => {
    const response = {
      data: [],
      meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
    };
    const fetchMock = vi.fn().mockResolvedValue(successResponse(response));
    vi.stubGlobal("fetch", fetchMock);

    await getTicketLibraryEntries("org-1", {
      search: "cache",
      productId: "product-1",
      page: 2,
      limit: 20,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toMatch(/\/ticket-library\?/);
    expect(url).toContain("search=cache");
    expect(url).toContain("productId=product-1");
    expect(url).toContain("page=2");
    expect(url).toContain("limit=20");
    expect(init).toMatchObject({
      method: "GET",
      headers: { "x-organization-id": "org-1" },
    });
  });

  it("creates, updates, and deletes knowledge articles using their own endpoints", async () => {
    const entry = { id: "entry-1", title: "Cache reset" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successResponse(entry))
      .mockResolvedValueOnce(successResponse(entry))
      .mockResolvedValueOnce(successResponse({ id: "entry-1", deleted: true }));
    vi.stubGlobal("fetch", fetchMock);

    await createTicketLibraryEntry("org-1", {
      title: "Cache reset",
      problem: "Stale data",
      resolution: "Clear cache",
      tags: ["cache"],
    });
    await updateTicketLibraryEntry("org-1", "entry-1", {
      title: "Cache reset updated",
    });
    await deleteTicketLibraryEntry("org-1", "entry-1");

    expect(
      fetchMock.mock.calls.map((call) => [
        (call[0] as string).split("/api/v1")[1].split("?")[0],
        (call[1] as RequestInit).method,
      ]),
    ).toEqual([
      ["/ticket-library", "POST"],
      ["/ticket-library/entry-1", "PATCH"],
      ["/ticket-library/entry-1", "DELETE"],
    ]);
  });
});
