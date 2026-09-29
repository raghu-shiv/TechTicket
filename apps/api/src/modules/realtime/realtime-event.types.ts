import type { RealtimeEventName } from './realtime.types';

export type RealtimeBroadcastTarget =
  | {
      type: 'organization';
      organizationId: string;
    }
  | {
      type: 'ticket';
      organizationId: string;
      ticketId: string;
    }
  | {
      type: 'user';
      organizationId: string;
      userId: string;
    };

export interface RealtimeDomainEvent<TPayload = unknown> {
  event: RealtimeEventName;
  organizationId: string;
  payload: TPayload;
}

export interface RealtimeBroadcastEvent<
  TPayload = unknown,
> extends RealtimeDomainEvent<TPayload> {
  targets: RealtimeBroadcastTarget[];
}

export interface RealtimeEventMetadata {
  organizationId: string;
  actorId?: string;
  occurredAt?: Date;
}

export interface RealtimeTicketEventPayload extends RealtimeEventMetadata {
  ticketId: string;
}
