import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';

import type { Server, Socket } from 'socket.io';

import { AuthContextService } from '../../common/auth/auth-context.service';
import type { AuthContext } from '../../common/auth/auth.types';
import { REALTIME_EVENTS } from './realtime.types';
import { RealtimeService } from './realtime.service';
import { OrganizationContextService } from '../../common/organization/organization-context.service';

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
  ) {}

  afterInit(server: Server): void {
    server.use(async (socket: AuthenticatedSocket, next) => {
      try {
        console.log(
          '[REALTIME AUTH] handshake headers:',
          socket.handshake.headers,
        );
        console.log('[REALTIME AUTH] cookie:', socket.handshake.headers.cookie);
        console.log(
          '[REALTIME AUTH] organization:',
          socket.handshake.headers['x-organization-id'],
        );

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

    this.realtimeService.setServer(server);
  }

  handleConnection(socket: Socket): void {
    const auth = socket.data.auth;

    if (!auth?.user?.id) {
      socket.disconnect(true);
      return;
    }

    socket.emit(REALTIME_EVENTS.CONNECTED, {
      userId: auth.user.id,
      organizationId: auth.organization?.organizationId,
    });
  }

  handleDisconnect(socket: Socket): void {
    this.realtimeService.handleDisconnect(socket);
  }
}
