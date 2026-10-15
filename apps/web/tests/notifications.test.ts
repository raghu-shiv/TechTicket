import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getNotifications,
  markNotificationRead,
} from "@/lib/api/notifications";
import type { NotificationListResponse } from "@/types/notifications";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("getNotifications", () => {
  it("sends pagination and organization scope to the existing API base", async () => {
    const responseBody: NotificationListResponse = {
      data: [],
      meta: {
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
        unreadCount: 0,
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const result = await getNotifications("org-a", {
      page: 1,
      limit: 10,
    });

    expect(result).toEqual(responseBody);

    const [rawUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    const url = new URL(rawUrl);
    const headers = requestInit.headers as Record<string, string>;

    expect(url.pathname).toBe("/api/v1/notifications");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.has("unreadOnly")).toBe(false);
    expect(headers["x-organization-id"]).toBe("org-a");
    expect(requestInit.credentials).toBe("include");
    expect(requestInit.cache).toBe("no-store");
  });

  it("supports the unread-only filter", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [],
        meta: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          unreadCount: 0,
        },
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    await getNotifications("org-a", {
      page: 1,
      limit: 10,
      unreadOnly: true,
    });

    const [rawUrl] = fetchMock.mock.calls[0] as unknown as [string];

    const url = new URL(rawUrl);

    expect(url.searchParams.get("unreadOnly")).toBe("true");
  });
});

describe("markNotificationRead", () => {
  it("uses PATCH and preserves organization scope", async () => {
    const responseBody = {
      id: "notification-1",
      type: "TICKET_STATUS_CHANGED",
      title: "Ticket status changed",
      message: "Ticket status changed from OPEN to RESOLVED.",
      ticketId: "ticket-1",
      createdAt: "2026-10-14T05:00:00.000Z",
      readAt: "2026-10-14T05:05:00.000Z",
      ticket: {
        id: "ticket-1",
        ticketNumber: "TT-000123",
        title: "Login issue",
      },
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => responseBody,
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const result = await markNotificationRead("org-a", "notification/one");

    expect(result).toEqual(responseBody);

    const [rawUrl, requestInit] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    const url = new URL(rawUrl);
    const headers = requestInit.headers as Record<string, string>;

    expect(url.pathname).toBe("/api/v1/notifications/notification%2Fone/read");
    expect(requestInit.method).toBe("PATCH");
    expect(headers["x-organization-id"]).toBe("org-a");
    expect(requestInit.credentials).toBe("include");
  });

  it("propagates authorization and API errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        message: "Notification not found.",
      }),
    } as Response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      markNotificationRead("org-a", "notification-1"),
    ).rejects.toThrow("Notification not found.");
  });
});
