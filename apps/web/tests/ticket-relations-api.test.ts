import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createTicketRelation,
  deleteTicketAttachment,
  deleteTicketRelation,
  getTicketRelations,
  updateTicketAssignment,
} from "@/lib/api/tickets";

afterEach(() => {
  vi.unstubAllGlobals();
});

function successResponse(body: unknown = {}) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response;
}

describe("UI-7 ticket workflow API contracts", () => {
  it("uses the organization-scoped ticket relation endpoints", async () => {
    const relation = {
      id: "relation-1",
      type: "RELATED",
      direction: "OUTGOING",
      ticket: {
        id: "ticket-2",
        ticketNumber: "TT-0002",
        title: "Related ticket",
        status: "OPEN",
        priority: "MEDIUM",
      },
      createdAt: "2026-10-16T00:00:00.000Z",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(successResponse([relation]))
      .mockResolvedValueOnce(successResponse(relation))
      .mockResolvedValueOnce(successResponse({ message: "Removed" }));

    vi.stubGlobal("fetch", fetchMock);

    await getTicketRelations("org-1", "ticket-1");
    await createTicketRelation("org-1", "ticket-1", {
      relatedTicketId: "ticket-2",
      type: "RELATED",
    });
    await deleteTicketRelation("org-1", "ticket-1", "relation-1");

    expect(
      fetchMock.mock.calls.map((call) => [
        (call[0] as string).split("/api/v1")[1],
        (call[1] as RequestInit).method,
      ]),
    ).toEqual([
      ["/tickets/ticket-1/relations", "GET"],
      ["/tickets/ticket-1/relations", "POST"],
      ["/tickets/ticket-1/relations/relation-1", "DELETE"],
    ]);

    for (const [, init] of fetchMock.mock.calls as unknown as Array<
      [string, RequestInit]
    >) {
      expect(
        (init.headers as Record<string, string>)["x-organization-id"],
      ).toBe("org-1");
    }

    const createInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(JSON.parse(createInit.body as string)).toEqual({
      relatedTicketId: "ticket-2",
      type: "RELATED",
    });
  });

  it("sends both assignee and team IDs when updating assignment", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await updateTicketAssignment("org-1", "ticket-1", {
      assigneeId: "user-1",
      teamId: "team-1",
    });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toContain("/tickets/ticket-1/assignment");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({
      assigneeId: "user-1",
      teamId: "team-1",
    });
    expect((init.headers as Record<string, string>)["x-organization-id"]).toBe(
      "org-1",
    );
  });

  it("uses the existing organization-scoped attachment delete endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(successResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await deleteTicketAttachment("org-1", "ticket-1", "attachment-1");

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];

    expect(url).toContain("/tickets/ticket-1/attachments/attachment-1");
    expect(init.method).toBe("DELETE");
    expect((init.headers as Record<string, string>)["x-organization-id"]).toBe(
      "org-1",
    );
  });
});
