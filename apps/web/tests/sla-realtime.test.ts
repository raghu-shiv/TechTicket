import { describe, expect, it } from "vitest";

import {
  isSlaRealtimeEvent,
  isSlaRealtimeEventForOrganization,
  isSlaRealtimeEventForTicket,
} from "@/lib/sla-realtime";

describe("SLA realtime presentation", () => {
  const payload = {
    escalationId: "escalation-1",
    ticketId: "ticket-1",
    ticketSlaId: "ticket-sla-1",
    type: "FIRST_RESPONSE_BREACH" as const,
    organizationId: "org-1",
    occurredAt: "2026-10-05T10:00:00.000Z",
  };

  it("recognizes first-response breach events", () => {
    expect(isSlaRealtimeEvent("ticket.sla.first_response.breached")).toBe(true);
  });

  it("recognizes resolution breach events", () => {
    expect(isSlaRealtimeEvent("ticket.sla.resolution.breached")).toBe(true);
  });

  it("rejects unrelated realtime events", () => {
    expect(isSlaRealtimeEvent("ticket.updated")).toBe(false);
  });

  it("accepts events from the current organization", () => {
    expect(isSlaRealtimeEventForOrganization(payload, "org-1")).toBe(true);
  });

  it("rejects events from another organization", () => {
    expect(isSlaRealtimeEventForOrganization(payload, "org-2")).toBe(false);
  });

  it("accepts events for the current ticket", () => {
    expect(isSlaRealtimeEventForTicket(payload, "ticket-1")).toBe(true);
  });

  it("rejects events for another ticket", () => {
    expect(isSlaRealtimeEventForTicket(payload, "ticket-2")).toBe(false);
  });
});
