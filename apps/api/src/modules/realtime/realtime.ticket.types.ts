export const REALTIME_TICKET_EVENTS = {
  SUBSCRIBE: 'ticket.subscribe',
  SUBSCRIBED: 'ticket.subscribed',
  UNSUBSCRIBE: 'ticket.unsubscribe',
  UNSUBSCRIBED: 'ticket.unsubscribed',
} as const;

export type RealtimeTicketEventName =
  (typeof REALTIME_TICKET_EVENTS)[keyof typeof REALTIME_TICKET_EVENTS];

export interface TicketRoomSubscriptionPayload {
  ticketId: string;
}

export interface TicketRoomSubscriptionResponse {
  ticketId: string;
  room: string;
}
