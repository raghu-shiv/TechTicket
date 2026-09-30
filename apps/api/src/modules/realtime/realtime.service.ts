import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import type { Namespace, Socket } from 'socket.io';

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
}
