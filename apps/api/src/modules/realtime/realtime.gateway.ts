import { OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';

import type { Server, Socket } from 'socket.io';

import { AuthContextService } from '../../common/auth/auth-context.service';
import type { AuthContext } from '../../common/auth/auth.types';
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
export class RealtimeGateway implements OnGatewayInit {
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
}
