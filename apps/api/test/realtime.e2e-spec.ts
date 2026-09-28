import { INestApplication } from '@nestjs/common';
import { io } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

import { RealtimeService } from '../src/modules/realtime/realtime.service.js';
import { REALTIME_ROOMS } from '../src/modules/realtime/realtime.rooms.js';
import { TicketsService } from '../src/modules/tickets/tickets.service.js';
import { RealtimeGateway } from '../src/modules/realtime/realtime.gateway.js';

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

    const ticketsService = app.get(TicketsService);
    const gateway = app.get(RealtimeGateway);
    const realtimeService = app.get(RealtimeService);

    const otherOrganizationTicket = await ticketsService.create(
      {
        userId: otherFixture.owner.userId,
        organizationId: otherOrganization.id,
        role: otherFixture.owner.role,
      },
      {
        title: 'Cross-organization realtime ticket',
        description:
          'This ticket must not be accessible from another organization.',
      },
    );

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': organization.id,
      },
      autoConnect: false,
    });

    const connected = new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });

    try {
      socket.connect();
      await connected;

      expect(socket.connected).toBe(true);

      const namespace = realtimeService.getNamespace();
      const connectedSocket = namespace.sockets.get(socket.id);

      expect(connectedSocket).toBeDefined();

      if (!connectedSocket) {
        throw new Error(
          'Connected realtime socket was not found in the realtime namespace',
        );
      }

      const ticketRoom = REALTIME_ROOMS.ticket(otherOrganizationTicket.id);

      expect(connectedSocket.rooms.has(ticketRoom)).toBe(false);

      await expect(
        gateway.subscribeToTicket(connectedSocket, {
          ticketId: otherOrganizationTicket.id,
        }),
      ).rejects.toThrow('Ticket not found');

      expect(connectedSocket.rooms.has(ticketRoom)).toBe(false);
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

  it('should resolve a ticket only when it belongs to the authenticated organization', async () => {
    const fixture = await createOrganizationTestFixture(app);
    const otherFixture = await createOrganizationTestFixture(app);

    const { cookies } = fixture.owner;
    const { organization } = fixture;
    const { organization: otherOrganization } = otherFixture;

    const cookieHeader = cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const ticketsService = app.get(TicketsService);

    const ticket = await ticketsService.create(
      {
        userId: fixture.owner.userId,
        organizationId: organization.id,
        role: fixture.owner.role,
      },
      {
        title: 'Realtime ownership test',
        description: 'Ticket used to verify realtime organization ownership.',
      },
    );

    const otherOrganizationTicket = await ticketsService.create(
      {
        userId: otherFixture.owner.userId,
        organizationId: otherOrganization.id,
        role: otherFixture.owner.role,
      },
      {
        title: 'Other organization ticket',
        description: 'Ticket must not be visible across organizations.',
      },
    );

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': organization.id,
      },
      autoConnect: false,
    });

    const connected = new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });

    try {
      socket.connect();
      await connected;

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

      expect(connectedSocket.data.auth?.user.id).toBe(fixture.owner.userId);

      expect(connectedSocket.data.auth?.organization?.organizationId).toBe(
        organization.id,
      );

      const gateway = app.get(RealtimeGateway);

      // Ticket belongs to the authenticated organization.
      const resolvedTicket = await gateway.resolveTicketForSocket(
        connectedSocket,
        ticket.id,
      );

      expect(resolvedTicket.id).toBe(ticket.id);
      expect(resolvedTicket.organizationId).toBe(organization.id);

      // Ticket belongs to another organization.
      await expect(
        gateway.resolveTicketForSocket(
          connectedSocket,
          otherOrganizationTicket.id,
        ),
      ).rejects.toThrow('Ticket not found');
    } finally {
      socket.disconnect();
    }
  });

  it('should join the authenticated socket to its ticket room', async () => {
    const fixture = await createOrganizationTestFixture(app);

    const { cookies } = fixture.owner;
    const { organization } = fixture;

    const cookieHeader = cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const ticketsService = app.get(TicketsService);

    const ticket = await ticketsService.create(
      {
        userId: fixture.owner.userId,
        organizationId: organization.id,
        role: fixture.owner.role,
      },
      {
        title: 'Realtime ticket room test',
        description: 'Ticket used to verify realtime ticket room subscription.',
      },
    );

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': organization.id,
      },
      autoConnect: false,
    });

    const connected = new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });

    try {
      socket.connect();
      await connected;

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

      const room = REALTIME_ROOMS.ticket(ticket.id);

      expect(connectedSocket.rooms.has(room)).toBe(false);

      const gateway = app.get(RealtimeGateway);

      await gateway.subscribeToTicket(connectedSocket, {
        ticketId: ticket.id,
      });

      expect(connectedSocket.rooms.has(room)).toBe(true);
    } finally {
      socket.disconnect();
    }
  });

  it('should not join a ticket room for a ticket in another organization', async () => {
    const fixture = await createOrganizationTestFixture(app);
    const otherFixture = await createOrganizationTestFixture(app);

    const cookieHeader = fixture.owner.cookies
      .map((cookie) => cookie.split(';', 1)[0])
      .join('; ');

    const ticketsService = app.get(TicketsService);

    const otherOrganizationTicket = await ticketsService.create(
      {
        userId: otherFixture.owner.userId,
        organizationId: otherFixture.organization.id,
        role: otherFixture.owner.role,
      },
      {
        title: 'Cross organization realtime ticket',
        description: 'This ticket must not be subscribable.',
      },
    );

    const socket = io(`${baseUrl}/realtime`, {
      transports: ['websocket'],
      extraHeaders: {
        Cookie: cookieHeader,
        'x-organization-id': fixture.organization.id,
      },
      autoConnect: false,
    });

    const connected = new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });

    try {
      socket.connect();
      await connected;

      const realtimeService = app.get(RealtimeService);
      const realtimeNamespace = realtimeService.getNamespace();

      const connectedSocket = realtimeNamespace.sockets.get(socket.id);

      expect(connectedSocket).toBeDefined();

      if (!connectedSocket) {
        throw new Error(
          'Connected realtime socket was not found in the realtime namespace',
        );
      }

      const room = REALTIME_ROOMS.ticket(otherOrganizationTicket.id);

      expect(connectedSocket.rooms.has(room)).toBe(false);

      const gateway = app.get(RealtimeGateway);

      await expect(
        gateway.subscribeToTicket(connectedSocket, {
          ticketId: otherOrganizationTicket.id,
        }),
      ).rejects.toThrow('Ticket not found');

      expect(connectedSocket.rooms.has(room)).toBe(false);
    } finally {
      socket.disconnect();
    }
  });

  it('should isolate ticket rooms between organizations', async () => {
    const fixture = await createOrganizationTestFixture(app);
    const otherFixture = await createOrganizationTestFixture(app);

    const ticketsService = app.get(TicketsService);
    const realtimeService = app.get(RealtimeService);
    const gateway = app.get(RealtimeGateway);

    const ticketA = await ticketsService.create(
      {
        userId: fixture.owner.userId,
        organizationId: fixture.organization.id,
        role: fixture.owner.role,
      },
      {
        title: 'Organization A realtime isolation ticket',
        description: 'Ticket belonging to organization A.',
      },
    );

    const ticketB = await ticketsService.create(
      {
        userId: otherFixture.owner.userId,
        organizationId: otherFixture.organization.id,
        role: otherFixture.owner.role,
      },
      {
        title: 'Organization B realtime isolation ticket',
        description: 'Ticket belonging to organization B.',
      },
    );

    const createSocket = (cookies: string[], organizationId: string) => {
      const cookieHeader = cookies
        .map((cookie) => cookie.split(';', 1)[0])
        .join('; ');

      return io(`${baseUrl}/realtime`, {
        transports: ['websocket'],
        extraHeaders: {
          Cookie: cookieHeader,
          'x-organization-id': organizationId,
        },
        autoConnect: false,
      });
    };

    const socketA = createSocket(
      fixture.owner.cookies,
      fixture.organization.id,
    );

    const socketB = createSocket(
      otherFixture.owner.cookies,
      otherFixture.organization.id,
    );

    const waitForConnection = (socket: ReturnType<typeof io>) =>
      new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', reject);
      });

    try {
      socketA.connect();
      socketB.connect();

      await Promise.all([
        waitForConnection(socketA),
        waitForConnection(socketB),
      ]);

      expect(socketA.connected).toBe(true);
      expect(socketB.connected).toBe(true);

      const namespace = realtimeService.getNamespace();

      const connectedSocketA = namespace.sockets.get(socketA.id);
      const connectedSocketB = namespace.sockets.get(socketB.id);

      expect(connectedSocketA).toBeDefined();
      expect(connectedSocketB).toBeDefined();

      if (!connectedSocketA || !connectedSocketB) {
        throw new Error(
          'Connected realtime sockets were not found in the realtime namespace',
        );
      }

      await gateway.subscribeToTicket(connectedSocketA, {
        ticketId: ticketA.id,
      });

      await gateway.subscribeToTicket(connectedSocketB, {
        ticketId: ticketB.id,
      });

      const ticketRoomA = REALTIME_ROOMS.ticket(ticketA.id);
      const ticketRoomB = REALTIME_ROOMS.ticket(ticketB.id);

      expect(connectedSocketA.rooms.has(ticketRoomA)).toBe(true);
      expect(connectedSocketA.rooms.has(ticketRoomB)).toBe(false);

      expect(connectedSocketB.rooms.has(ticketRoomB)).toBe(true);
      expect(connectedSocketB.rooms.has(ticketRoomA)).toBe(false);

      expect(ticketA.organizationId).toBe(fixture.organization.id);
      expect(ticketB.organizationId).toBe(otherFixture.organization.id);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('should clean up ticket room membership when the socket disconnects', async () => {
    const fixture = await createOrganizationTestFixture(app);

    const { cookies } = fixture.owner;
    const { organization } = fixture;

    const ticketsService = app.get(TicketsService);
    const realtimeService = app.get(RealtimeService);
    const gateway = app.get(RealtimeGateway);

    const ticket = await ticketsService.create(
      {
        userId: fixture.owner.userId,
        organizationId: organization.id,
        role: fixture.owner.role,
      },
      {
        title: 'Realtime ticket lifecycle test',
        description: 'Ticket used to verify room lifecycle cleanup.',
      },
    );

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

    const connected = new Promise<void>((resolve, reject) => {
      socket.once('connect', () => resolve());
      socket.once('connect_error', reject);
    });

    try {
      socket.connect();
      await connected;

      const namespace = realtimeService.getNamespace();
      const connectedSocket = namespace.sockets.get(socket.id);

      expect(connectedSocket).toBeDefined();

      if (!connectedSocket) {
        throw new Error(
          'Connected realtime socket was not found in the realtime namespace',
        );
      }

      await gateway.subscribeToTicket(connectedSocket, {
        ticketId: ticket.id,
      });

      const ticketRoom = REALTIME_ROOMS.ticket(ticket.id);

      expect(connectedSocket.rooms.has(ticketRoom)).toBe(true);

      const socketId = socket.id;

      socket.disconnect();

      await new Promise<void>((resolve) => {
        setTimeout(resolve, 100);
      });

      expect(namespace.sockets.get(socketId)).toBeUndefined();

      const remainingRoomMembers = namespace.adapter.rooms.get(ticketRoom);

      expect(remainingRoomMembers?.has(socketId) ?? false).toBe(false);
    } finally {
      if (socket.connected) {
        socket.disconnect();
      }
    }
  });
});
