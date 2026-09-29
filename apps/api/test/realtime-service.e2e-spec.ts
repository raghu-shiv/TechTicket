import type { Namespace, Socket } from 'socket.io';
import { describe, expect, it } from 'vitest';

import { RealtimeService } from '../src/modules/realtime/realtime.service';

describe('RealtimeService', () => {
  it('should report realtime as not ready before namespace registration', () => {
    const service = new RealtimeService();

    expect(service.isReady()).toBe(false);
  });

  it('should reject namespace access before initialization', () => {
    const service = new RealtimeService();

    expect(() => service.getNamespace()).toThrow(
      'Realtime Socket.IO namespace is not initialized',
    );
  });

  it('should register the namespace and report realtime as ready', () => {
    const service = new RealtimeService();

    const namespace = {} as Namespace;

    service.setNamespace(namespace);

    expect(service.isReady()).toBe(true);
    expect(service.getNamespace()).toBe(namespace);
  });

  it('should replace the registered namespace when setNamespace is called again', () => {
    const service = new RealtimeService();

    const firstNamespace = {} as Namespace;
    const secondNamespace = {} as Namespace;

    service.setNamespace(firstNamespace);
    service.setNamespace(secondNamespace);

    expect(service.getNamespace()).toBe(secondNamespace);
    expect(service.isReady()).toBe(true);
  });

  it('should handle disconnects without throwing when socket has no authenticated user', () => {
    const service = new RealtimeService();

    const socket = {
      id: 'socket-1',
      data: {},
    } as Socket;

    expect(() => service.handleDisconnect(socket)).not.toThrow();
  });

  it('should handle disconnects for an authenticated socket', () => {
    const service = new RealtimeService();

    const socket = {
      id: 'socket-2',
      data: {
        auth: {
          user: {
            id: 'user-1',
          },
        },
      },
    } as Socket;

    expect(() => service.handleDisconnect(socket)).not.toThrow();
  });
});
