export const REALTIME_EVENTS = {
  SLA_FIRST_RESPONSE_BREACHED: "ticket.sla.first_response.breached",

  SLA_RESOLUTION_BREACHED: "ticket.sla.resolution.breached",
} as const;

export type SlaRealtimeEvent =
  (typeof REALTIME_EVENTS)[keyof typeof REALTIME_EVENTS];

export type SlaRealtimeEventPayload = {
  escalationId: string;
  ticketId: string;
  ticketSlaId: string;
  type: "FIRST_RESPONSE_BREACH" | "RESOLUTION_BREACH";
  organizationId: string;
  occurredAt: string;
};
