import type { INestApplication } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { RealtimeService } from '../src/modules/realtime/realtime.service.js';
import { RealtimeGateway } from '../src/modules/realtime/realtime.gateway.js';
import {
  REALTIME_EVENTS,
  REALTIME_ROOMS,
} from '../src/modules/realtime/realtime.types.js';
import { TicketsService } from '../src/modules/tickets/tickets.service.js';

describe('Realtime room routing (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    app = await createTestApp();

    const server = app.getHttpServer();

    await new Promise<void>((resolve) => {
      server.listen(0, resolve);
    });

    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Unable to determine test server address');
    }

    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  function cookieHeader(cookies: string[]): string {
    return cookies.map((cookie) => cookie.split(';', 1)[0]).join('; ');
  }

  function createSocket(cookies: string[], organizationId: string): Socket {
    return io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader(cookies),
        'x-organization-id': organizationId,
      },
      autoConnect: false,
    });
  }

  async function connectSocket(socket: Socket): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      socket.once('connect', resolve);
      socket.once('connect_error', reject);
      socket.connect();
    });
  }

  it('should route organization events only to the matching organization room', async () => {
    const fixtureA = await createOrganizationTestFixture(app);
    const fixtureB = await createOrganizationTestFixture(app);

    const socketA = createSocket(
      fixtureA.owner.cookies,
      fixtureA.organization.id,
    );

    const socketB = createSocket(
      fixtureB.owner.cookies,
      fixtureB.organization.id,
    );

    try {
      await Promise.all([connectSocket(socketA), connectSocket(socketB)]);

      const organizationEventA = new Promise<void>((resolve) => {
        socketA.once(REALTIME_EVENTS.TICKET_CREATED, () => resolve());
      });

      let organizationEventBReceived = false;

      socketB.once(REALTIME_EVENTS.TICKET_CREATED, () => {
        organizationEventBReceived = true;
      });

      const realtimeService = app.get(RealtimeService);

      realtimeService
        .getNamespace()
        .to(REALTIME_ROOMS.organization(fixtureA.organization.id))
        .emit(REALTIME_EVENTS.TICKET_CREATED, {
          ticketId: 'ticket-org-a',
          organizationId: fixtureA.organization.id,
        });

      await organizationEventA;

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(organizationEventBReceived).toBe(false);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('should route ticket events only to sockets subscribed to that ticket room', async () => {
    const fixture = await createOrganizationTestFixture(app);

    const ticketsService = app.get(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      // resolved by the existing app provider
      TicketsService,
    );

    const ticketA = await ticketsService.create(
      {
        userId: fixture.owner.userId,
        organizationId: fixture.organization.id,
        role: fixture.owner.role,
      },
      {
        title: 'Routing ticket A',
        description: 'Ticket room routing test A',
      },
    );

    const ticketB = await ticketsService.create(
      {
        userId: fixture.owner.userId,
        organizationId: fixture.organization.id,
        role: fixture.owner.role,
      },
      {
        title: 'Routing ticket B',
        description: 'Ticket room routing test B',
      },
    );

    const socketA = createSocket(
      fixture.owner.cookies,
      fixture.organization.id,
    );

    const socketB = createSocket(
      fixture.owner.cookies,
      fixture.organization.id,
    );

    try {
      await Promise.all([connectSocket(socketA), connectSocket(socketB)]);

      const realtimeService = app.get(RealtimeService);
      const gateway = app.get(RealtimeGateway);

      const connectedSocketA = realtimeService
        .getNamespace()
        .sockets.get(socketA.id);

      const connectedSocketB = realtimeService
        .getNamespace()
        .sockets.get(socketB.id);

      expect(connectedSocketA).toBeDefined();
      expect(connectedSocketB).toBeDefined();

      if (!connectedSocketA || !connectedSocketB) {
        throw new Error('Connected sockets were not found');
      }

      await gateway.joinTicketRoom(connectedSocketA, ticketA.id);

      await gateway.joinTicketRoom(connectedSocketB, ticketB.id);

      const ticketAEvent = new Promise<void>((resolve) => {
        socketA.once(REALTIME_EVENTS.TICKET_UPDATED, () => resolve());
      });

      let ticketBReceived = false;

      socketB.once(REALTIME_EVENTS.TICKET_UPDATED, () => {
        ticketBReceived = true;
      });

      realtimeService
        .getNamespace()
        .to(REALTIME_ROOMS.ticket(ticketA.id))
        .emit(REALTIME_EVENTS.TICKET_UPDATED, {
          ticketId: ticketA.id,
          organizationId: fixture.organization.id,
        });

      await ticketAEvent;

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(ticketBReceived).toBe(false);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('should route notification events only to the intended recipient user room', async () => {
    const fixture = await createOrganizationTestFixture(app);

    const socketRecipient = createSocket(
      fixture.requester.cookies,
      fixture.organization.id,
    );

    const socketOtherUser = createSocket(
      fixture.agent.cookies,
      fixture.organization.id,
    );

    try {
      await Promise.all([
        connectSocket(socketRecipient),
        connectSocket(socketOtherUser),
      ]);

      const recipientEvent = new Promise<void>((resolve) => {
        socketRecipient.once(REALTIME_EVENTS.NOTIFICATION_CREATED, () =>
          resolve(),
        );
      });

      let otherUserReceived = false;

      socketOtherUser.once(REALTIME_EVENTS.NOTIFICATION_CREATED, () => {
        otherUserReceived = true;
      });

      const notificationService = app.get(NotificationService);

      notificationService.createNotification({
        organizationId: fixture.organization.id,
        recipientId: fixture.requester.userId,
        actorId: fixture.owner.userId,
        type: 'TICKET_STATUS_CHANGED',
        title: 'Ticket status changed',
        message: 'Ticket TKT-000001 is now resolved.',
      });

      await recipientEvent;

      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(otherUserReceived).toBe(false);
    } finally {
      socketRecipient.disconnect();
      socketOtherUser.disconnect();
    }
  });

  it('should reject joining another user room', async () => {
    const fixture = await createOrganizationTestFixture(app);

    const socket = createSocket(
      fixture.requester.cookies,
      fixture.organization.id,
    );

    try {
      await connectSocket(socket);

      const realtimeService = app.get(RealtimeService);
      const gateway = app.get(RealtimeGateway);

      const connectedSocket = realtimeService
        .getNamespace()
        .sockets.get(socket.id);

      expect(connectedSocket).toBeDefined();

      if (!connectedSocket) {
        throw new Error('Connected socket was not found');
      }

      await expect(
        gateway.joinUserRoom(connectedSocket, fixture.agent.userId),
      ).rejects.toThrow('You do not have access to this user room');

      expect(
        connectedSocket.rooms.has(REALTIME_ROOMS.user(fixture.agent.userId)),
      ).toBe(false);
    } finally {
      socket.disconnect();
    }
  });
});
