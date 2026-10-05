import {
  REALTIME_EVENTS,
  type SlaRealtimeEvent,
  type SlaRealtimeEventPayload,
} from "@/types/realtime";

export function isSlaRealtimeEvent(event: string): event is SlaRealtimeEvent {
  return (
    event === REALTIME_EVENTS.SLA_FIRST_RESPONSE_BREACHED ||
    event === REALTIME_EVENTS.SLA_RESOLUTION_BREACHED
  );
}

export function isSlaRealtimeEventForOrganization(
  payload: SlaRealtimeEventPayload,
  organizationId: string,
): boolean {
  return payload.organizationId === organizationId;
}

export function isSlaRealtimeEventForTicket(
  payload: SlaRealtimeEventPayload,
  ticketId: string,
): boolean {
  return payload.ticketId === ticketId;
}
