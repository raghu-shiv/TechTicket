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
  ) {}

  afterInit(server: Server): void {
    server.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const authContext = await this.authContext.getContext(
          socket.handshake.headers,
        );

        socket.data.auth = authContext;

        next();
      } catch {
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
    });
  }

  handleDisconnect(socket: Socket): void {
    this.realtimeService.handleDisconnect(socket);
  }
}
