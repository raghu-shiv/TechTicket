import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';

import type { Namespace, Socket } from 'socket.io';

import { AuthContextService } from '../../common/auth/auth-context.service';
import type { AuthContext } from '../../common/auth/auth.types';
import { OrganizationContextService } from '../../common/organization/organization-context.service';
import { TicketsService } from '../tickets/tickets.service';
import { REALTIME_EVENTS } from './realtime.types';
import { REALTIME_ROOMS } from './realtime.rooms';
import { RealtimeService } from './realtime.service';

type AuthenticatedSocket = Socket & {
  data: {
    auth?: AuthContext;
  };
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly authContext: AuthContextService,
    private readonly organizationContext: OrganizationContextService,
    private readonly ticketsService: TicketsService,
  ) {}

  afterInit(namespace: Namespace): void {
    namespace.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const authContext = await this.authContext.getContext(
          socket.handshake.headers,
        );

        const organizationId = socket.handshake.headers['x-organization-id'];

        if (typeof organizationId !== 'string' || !organizationId.trim()) {
          throw new Error('Organization context is required');
        }

        const organizationContext = await this.organizationContext.getContext(
          authContext.user.id,
          organizationId,
        );

        socket.data.auth = {
          ...authContext,
          organization: organizationContext,
        };

        next();
      } catch (error) {
        console.error('[REALTIME AUTH] failed:', error);
        next(new Error('Authentication required'));
      }
    });

    this.realtimeService.setNamespace(namespace);
  }

  handleConnection(socket: Socket): void {
    const auth = socket.data.auth;

    if (!auth?.user?.id || !auth.organization?.organizationId) {
      socket.disconnect(true);
      return;
    }

    const organizationRoom = REALTIME_ROOMS.organization(
      auth.organization.organizationId,
    );

    void socket.join(organizationRoom);

    socket.emit(REALTIME_EVENTS.CONNECTED, {
      userId: auth.user.id,
      organizationId: auth.organization.organizationId,
    });
  }

  async resolveTicketForSocket(socket: AuthenticatedSocket, ticketId: string) {
    const auth = socket.data.auth;

    if (!auth?.organization?.organizationId) {
      throw new Error('Organization context is required');
    }

    return this.ticketsService.findOne(auth.organization, ticketId);
  }

  @SubscribeMessage(REALTIME_EVENTS.SUBSCRIBE_TICKET)
  async subscribeToTicket(
    socket: AuthenticatedSocket,
    payload: { ticketId: string },
  ): Promise<{ ticketId: string; room: string }> {
    if (
      !payload ||
      typeof payload.ticketId !== 'string' ||
      !payload.ticketId.trim()
    ) {
      throw new Error('Ticket ID is required');
    }

    const ticket = await this.resolveTicketForSocket(socket, payload.ticketId);

    const room = REALTIME_ROOMS.ticket(ticket.id);

    await socket.join(room);

    return {
      ticketId: ticket.id,
      room,
    };
  }

  handleDisconnect(socket: Socket): void {
    this.realtimeService.handleDisconnect(socket);
  }
}
