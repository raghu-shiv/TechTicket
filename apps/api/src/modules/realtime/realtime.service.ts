import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';

import type { Namespace, Socket } from 'socket.io';

import {
  getTicketActivityActorPresentation,
  getTicketActivityCategory,
  getTicketActivityDescription,
  getTicketActivityTimeline,
} from '../tickets/ticket-activity.presentation';

@Injectable()
export class RealtimeService implements OnModuleDestroy {
  private readonly logger = new Logger(RealtimeService.name);

  private namespace: Namespace | null = null;

  setNamespace(namespace: Namespace): void {
    this.namespace = namespace;

    this.logger.log('Realtime Socket.IO namespace registered');
  }

  getNamespace(): Namespace {
    if (!this.namespace) {
      throw new Error('Realtime Socket.IO namespace is not initialized');
    }

    return this.namespace;
  }

  isReady(): boolean {
    return this.namespace !== null;
  }

  handleDisconnect(socket: Socket): void {
    const userId = socket.data.auth?.user?.id;

    this.logger.log(
      `Realtime client disconnected: socket=${socket.id}${
        userId ? ` user=${userId}` : ''
      }`,
    );
  }

  onModuleDestroy(): void {
    this.logger.log('Realtime Socket.IO service shutting down');

    this.namespace = null;
  }

  handleActivityCreated(event: TicketActivityCreatedEvent): void {
    const payload = {
      id: event.id,
      ticketId: event.ticketId,
      organizationId: event.organizationId,
      actorId: event.actorId,
      type: event.type,
      metadata: event.metadata,
      createdAt: event.createdAt,
      category: getTicketActivityCategory(event.type),
      timeline: getTicketActivityTimeline(event.createdAt),
      description: getTicketActivityDescription(
        event.type,
        event.metadata as Record<string, unknown> | null,
      ),
      actorPresentation: getTicketActivityActorPresentation(event.actor),
      actor: event.actor,
    };

    this.realtimeEventBroadcaster.broadcast({
      event: REALTIME_EVENTS.TICKET_ACTIVITY_CREATED,
      organizationId: event.organizationId,
      payload,
      targets: [
        {
          type: 'organization',
          organizationId: event.organizationId,
        },
        {
          type: 'ticket',
          organizationId: event.organizationId,
          ticketId: event.ticketId,
        },
      ],
    });
  }
}
