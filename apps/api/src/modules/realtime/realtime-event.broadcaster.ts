import { Injectable } from '@nestjs/common';

import type {
  RealtimeBroadcastEvent,
  RealtimeBroadcastTarget,
} from './realtime-event.types';
import { REALTIME_ROOMS } from './realtime.rooms';
import { RealtimeService } from './realtime.service';

@Injectable()
export class RealtimeEventBroadcaster {
  constructor(private readonly realtimeService: RealtimeService) {}

  broadcast<TPayload>(event: RealtimeBroadcastEvent<TPayload>): void {
    this.validateTargets(event.organizationId, event.targets);

    const namespace = this.realtimeService.getNamespace();

    for (const target of event.targets) {
      const room = this.resolveRoom(target);

      namespace.to(room).emit(event.event, event.payload);
    }
  }

  private validateTargets(
    organizationId: string,
    targets: RealtimeBroadcastTarget[],
  ): void {
    for (const target of targets) {
      if (target.organizationId !== organizationId) {
        throw new Error(
          'Realtime broadcast target organization does not match event organization',
        );
      }
    }
  }

  private resolveRoom(target: RealtimeBroadcastTarget): string {
    switch (target.type) {
      case 'organization':
        return REALTIME_ROOMS.organization(target.organizationId);

      case 'ticket':
        return REALTIME_ROOMS.ticket(target.ticketId);

      case 'user':
        return REALTIME_ROOMS.user(target.userId);
    }
  }
}
