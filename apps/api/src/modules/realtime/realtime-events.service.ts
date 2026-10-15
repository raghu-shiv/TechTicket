import { Injectable } from '@nestjs/common';

import type { RealtimeBroadcastEvent } from './realtime-event.types';
import { REALTIME_ROOMS } from './realtime.rooms';
import { RealtimeService } from './realtime.service';

@Injectable()
export class RealtimeEventsService {
  constructor(private readonly realtimeService: RealtimeService) {}

  broadcast<TPayload>(event: RealtimeBroadcastEvent<TPayload>): void {
    if (!event.organizationId.trim()) {
      throw new Error('Organization context is required');
    }

    if (!event.event) {
      throw new Error('Realtime event name is required');
    }

    if (!event.targets.length) {
      return;
    }

    const namespace = this.realtimeService.getNamespace();

    for (const target of event.targets) {
      if (target.organizationId !== event.organizationId) {
        throw new Error(
          'Realtime event target organization does not match event organization',
        );
      }

      const room = this.resolveRoom(target);

      namespace.to(room).emit(event.event, event.payload);
    }
  }

  private resolveRoom(
    target: RealtimeBroadcastEvent['targets'][number],
  ): string {
    switch (target.type) {
      case 'organization':
        return REALTIME_ROOMS.organization(target.organizationId);

      case 'ticket':
        return REALTIME_ROOMS.ticket(target.ticketId);

      case 'user':
        return REALTIME_ROOMS.user(target.userId);

      case 'organization-user':
        return REALTIME_ROOMS.organizationUser(
          target.organizationId,
          target.userId,
        );
    }
  }
}
