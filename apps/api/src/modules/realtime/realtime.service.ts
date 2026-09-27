import { Injectable, Logger } from '@nestjs/common';

import type { Server, Socket } from 'socket.io';

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);

  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
    this.logger.log('Realtime Socket.IO server registered');
  }

  getServer(): Server {
    if (!this.server) {
      throw new Error('Realtime Socket.IO server is not initialized');
    }

    return this.server;
  }

  isReady(): boolean {
    return this.server !== null;
  }

  handleDisconnect(socket: Socket): void {
    const userId = socket.data.auth?.user?.id;

    this.logger.log(
      `Realtime client disconnected: socket=${socket.id}${
        userId ? ` user=${userId}` : ''
      }`,
    );
  }
}
