import { ForbiddenException, Logger } from '@nestjs/common';
import {
  type OnGatewayConnection,
  type OnGatewayDisconnect,
  type OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

import { AuthContextService } from '../../common/auth/auth-context.service';
import type { AuthContext } from '../../common/auth/auth.types';
import { OrganizationContextService } from '../../common/organization/organization-context.service';
import { TicketsService } from '../tickets/tickets.service';
import { REALTIME_EVENTS, REALTIME_ROOMS } from './realtime.types';
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
  private readonly logger = new Logger(RealtimeGateway.name);

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
        this.logger.warn(
          `Realtime authentication failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );

        next(new Error('Authentication required'));
      }
    });

    this.realtimeService.setNamespace(namespace);
  }

  async handleConnection(socket: Socket): Promise<void> {
    const auth = socket.data.auth;

    if (!auth?.user?.id || !auth.organization?.organizationId) {
      socket.disconnect(true);
      return;
    }

    const organizationRoom = REALTIME_ROOMS.organization(
      auth.organization.organizationId,
    );

    const userRoom = REALTIME_ROOMS.user(auth.user.id);

    await Promise.all([socket.join(organizationRoom), socket.join(userRoom)]);

    socket.emit(REALTIME_EVENTS.CONNECTED, {
      userId: auth.user.id,
      organizationId: auth.organization.organizationId,
    });
  }

  async resolveTicketForSocket(socket: AuthenticatedSocket, ticketId: string) {
    const auth = this.requireOrganizationContext(socket);

    return this.ticketsService.findOne(auth.organization!, ticketId);
  }

  async assertTicketAccessForSocket(
    socket: AuthenticatedSocket,
    ticketId: string,
  ) {
    const auth = this.requireOrganizationContext(socket);

    return this.ticketsService.assertRealtimeAccess(
      auth.organization!,
      ticketId,
    );
  }

  /**
   * User-room authorization is intentionally strict:
   *
   * A socket may only subscribe to its own user room.
   *
   * User rooms are used for recipient-targeted realtime events,
   * so allowing arbitrary user-room membership would expose
   * another user's notifications.
   */
  async assertUserRoomAccessForSocket(
    socket: AuthenticatedSocket,
    userId: string,
  ): Promise<void> {
    const auth = this.requireOrganizationContext(socket);

    if (userId !== auth.user.id) {
      throw new ForbiddenException('You do not have access to this user room');
    }
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

    const ticket = await this.assertTicketAccessForSocket(
      socket,
      payload.ticketId,
    );

    const room = REALTIME_ROOMS.ticket(ticket.id);

    await socket.join(room);

    return {
      ticketId: ticket.id,
      room,
    };
  }

  async joinTicketRoom(
    socket: AuthenticatedSocket,
    ticketId: string,
  ): Promise<void> {
    const ticket = await this.assertTicketAccessForSocket(socket, ticketId);

    const room = REALTIME_ROOMS.ticket(ticket.id);

    await socket.join(room);
  }

  async joinUserRoom(
    socket: AuthenticatedSocket,
    userId: string,
  ): Promise<void> {
    await this.assertUserRoomAccessForSocket(socket, userId);

    const room = REALTIME_ROOMS.user(userId);

    await socket.join(room);
  }

  handleDisconnect(socket: Socket): void {
    this.realtimeService.handleDisconnect(socket);
  }

  private requireOrganizationContext(socket: AuthenticatedSocket): AuthContext {
    const auth = socket.data.auth;

    if (!auth?.user?.id || !auth.organization?.organizationId) {
      throw new Error('Organization context is required');
    }

    return auth;
  }
}
