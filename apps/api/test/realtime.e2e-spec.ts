import { INestApplication } from '@nestjs/common';
import { io } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

import { RealtimeService } from '../src/modules/realtime/realtime.service.js';
import { REALTIME_ROOMS } from '../src/modules/realtime/realtime.rooms.js';

describe('Realtime Authentication (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await createTestApp();

    const server = app.getHttpServer();

    await new Promise<void>((resolve) => server.listen(0, resolve));

    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Unable to determine test server address');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  it('should reject an unauthenticated realtime connection', async () => {
    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      autoConnect: false,
    });

    const error = await new Promise<Error>((resolve) => {
      socket.once('connect_error', resolve);
      socket.connect();
    });

    try {
      expect(error.message).toBe('Authentication required');
    } finally {
      socket.disconnect();
    }
  });

  it('should reject a realtime connection with an invalid session', async () => {
    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: 'better-auth.session_token=invalid-session-token',
      },
      autoConnect: false,
    });

    const error = await new Promise<Error>((resolve) => {
      socket.once('connect_error', resolve);
      socket.connect();
    });

    try {
      expect(error.message).toBe('Authentication required');
    } finally {
      socket.disconnect();
    }
  });

  it('should accept a realtime connection with a valid Better Auth session and organization context', async () => {
    const fixture = await createOrganizationTestFixture(app);

    const { userId, cookies } = fixture.owner;
    const { organization } = fixture;

    const cookieHeader = cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': organization.id,
      },
      autoConnect: false,
    });

    const connectedEvent = new Promise<{
      userId: string;
      organizationId: string;
    }>((resolve, reject) => {
      socket.once('realtime.connected', resolve);
      socket.once('connect_error', reject);
    });

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', reject);
        socket.connect();
      });

      expect(socket.connected).toBe(true);
    } finally {
      socket.disconnect();
    }

    const payload = await connectedEvent;

    expect(payload).toEqual({
      userId,
      organizationId: organization.id,
    });
  });

  it('should reject a realtime connection when the authenticated user is not a member of the requested organization', async () => {
    const fixture = await createOrganizationTestFixture(app);
    const otherFixture = await createOrganizationTestFixture(app);

    const { cookies } = fixture.owner;
    const { organization: otherOrganization } = otherFixture;

    const cookieHeader = cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': otherOrganization.id,
      },
      autoConnect: false,
    });

    const error = await new Promise<Error>((resolve) => {
      socket.once('connect_error', resolve);
      socket.connect();
    });

    try {
      expect(error.message).toBe('Authentication required');
      expect(socket.connected).toBe(false);
    } finally {
      socket.disconnect();
    }
  });

  it('should prevent cross-organization room access', async () => {
    const fixture = await createOrganizationTestFixture(app);
    const otherFixture = await createOrganizationTestFixture(app);

    const { cookies } = fixture.owner;
    const { organization } = fixture;
    const { organization: otherOrganization } = otherFixture;

    const cookieHeader = cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': organization.id,
      },
      autoConnect: false,
    });

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', reject);
        socket.connect();
      });

      expect(socket.connected).toBe(true);

      const realtimeService = app.get(RealtimeService);
      const realtimeNamespace = realtimeService.getNamespace();

      const connectedSocket = realtimeNamespace.sockets.get(socket.id);

      expect(connectedSocket).toBeDefined();

      if (!connectedSocket) {
        throw new Error(
          'Connected realtime socket was not found in the realtime namespace',
        );
      }

      const organizationRoom = REALTIME_ROOMS.organization(organization.id);

      const otherOrganizationRoom = REALTIME_ROOMS.organization(
        otherOrganization.id,
      );

      expect(connectedSocket.rooms.has(organizationRoom)).toBe(true);

      expect(connectedSocket.rooms.has(otherOrganizationRoom)).toBe(false);
    } finally {
      socket.disconnect();
    }
  });

  it('should isolate authenticated sockets to their own organization rooms', async () => {
    const organizationA = await createOrganizationTestFixture(app);
    const organizationB = await createOrganizationTestFixture(app);

    const cookieHeaderA = organizationA.owner.cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const cookieHeaderB = organizationB.owner.cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const socketA = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeaderA,
        'x-organization-id': organizationA.organization.id,
      },
      autoConnect: false,
    });

    const socketB = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeaderB,
        'x-organization-id': organizationB.organization.id,
      },
      autoConnect: false,
    });

    try {
      await Promise.all([
        new Promise<void>((resolve, reject) => {
          socketA.once('connect', () => resolve());
          socketA.once('connect_error', reject);
          socketA.connect();
        }),
        new Promise<void>((resolve, reject) => {
          socketB.once('connect', () => resolve());
          socketB.once('connect_error', reject);
          socketB.connect();
        }),
      ]);

      expect(socketA.connected).toBe(true);
      expect(socketB.connected).toBe(true);

      const realtimeService = app.get(RealtimeService);
      const realtimeNamespace = realtimeService.getNamespace();

      const connectedSocketA = realtimeNamespace.sockets.get(socketA.id);
      const connectedSocketB = realtimeNamespace.sockets.get(socketB.id);

      expect(connectedSocketA).toBeDefined();
      expect(connectedSocketB).toBeDefined();

      const organizationRoomA = REALTIME_ROOMS.organization(
        organizationA.organization.id,
      );

      const organizationRoomB = REALTIME_ROOMS.organization(
        organizationB.organization.id,
      );

      expect(connectedSocketA?.rooms.has(organizationRoomA)).toBe(true);
      expect(connectedSocketA?.rooms.has(organizationRoomB)).toBe(false);

      expect(connectedSocketB?.rooms.has(organizationRoomB)).toBe(true);
      expect(connectedSocketB?.rooms.has(organizationRoomA)).toBe(false);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('should preserve authenticated organization context throughout socket lifecycle', async () => {
    const fixture = await createOrganizationTestFixture(app);

    const { userId, cookies } = fixture.owner;
    const { organization } = fixture;

    const cookieHeader = cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': organization.id,
      },
      autoConnect: false,
    });

    const connectedEvent = new Promise<{
      userId: string;
      organizationId: string;
    }>((resolve, reject) => {
      socket.once('realtime.connected', resolve);
      socket.once('connect_error', reject);
    });

    try {
      await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', reject);
        socket.connect();
      });

      expect(socket.connected).toBe(true);

      const payload = await connectedEvent;

      expect(payload).toEqual({
        userId,
        organizationId: organization.id,
      });

      const realtimeService = app.get(RealtimeService);
      const realtimeNamespace = realtimeService.getNamespace();

      const connectedSocket = realtimeNamespace.sockets.get(socket.id);

      expect(connectedSocket).toBeDefined();

      expect(connectedSocket?.data.auth?.user.id).toBe(userId);
      expect(connectedSocket?.data.auth?.organization?.organizationId).toBe(
        organization.id,
      );

      expect(
        connectedSocket?.rooms.has(
          REALTIME_ROOMS.organization(organization.id),
        ),
      ).toBe(true);

      const socketId = socket.id;

      socket.disconnect();

      expect(socket.connected).toBe(false);

      await new Promise<void>((resolve) => {
        const checkDisconnected = (): void => {
          if (!realtimeNamespace.sockets.has(socketId)) {
            resolve();
            return;
          }

          setTimeout(checkDisconnected, 10);
        };

        checkDisconnected();
      });

      expect(realtimeNamespace.sockets.has(socketId)).toBe(false);
    } finally {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });
});
