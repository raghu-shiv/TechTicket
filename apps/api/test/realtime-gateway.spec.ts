import { describe, expect, it, vi } from 'vitest';

import { RealtimeGateway } from '../src/modules/realtime/realtime.gateway';

function createAuthenticatedSocket(
  userId = 'user-1',
  organizationId = 'org-1',
) {
  return {
    id: 'socket-1',
    data: {
      auth: {
        user: {
          id: userId,
        },
        organization: {
          organizationId,
        },
      },
    },
    join: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    emit: vi.fn(),
  };
}

function createGateway() {
  const realtimeService = {
    setNamespace: vi.fn(),
    handleDisconnect: vi.fn(),
  };

  const authContext = {
    getContext: vi.fn(),
  };

  const organizationContext = {
    getContext: vi.fn(),
  };

  const ticketsService = {
    findOne: vi.fn(),
    assertRealtimeAccess: vi.fn(),
  };

  const gateway = new RealtimeGateway(
    realtimeService as never,
    authContext as never,
    organizationContext as never,
    ticketsService as never,
  );

  return {
    gateway,
    realtimeService,
    authContext,
    organizationContext,
    ticketsService,
  };
}

describe('RealtimeGateway authorization', () => {
  it('should allow a socket to access its own user room', async () => {
    const { gateway } = createGateway();

    const socket = createAuthenticatedSocket('user-1');

    await expect(
      gateway.assertUserRoomAccessForSocket(socket as never, 'user-1'),
    ).resolves.toBeUndefined();
  });

  it('should reject access to another user room', async () => {
    const { gateway } = createGateway();

    const socket = createAuthenticatedSocket('user-1');

    await expect(
      gateway.assertUserRoomAccessForSocket(socket as never, 'user-2'),
    ).rejects.toThrow('You do not have access to this user room');
  });

  it('should reject user-room authorization when organization context is missing', async () => {
    const { gateway } = createGateway();

    const socket = {
      id: 'socket-1',
      data: {
        auth: {
          user: {
            id: 'user-1',
          },
        },
      },
    };

    await expect(
      gateway.assertUserRoomAccessForSocket(socket as never, 'user-1'),
    ).rejects.toThrow('Organization context is required');
  });

  it('should resolve a ticket through the authenticated organization context', async () => {
    const { gateway, ticketsService } = createGateway();

    const socket = createAuthenticatedSocket('user-1', 'org-1');

    const ticket = {
      id: 'ticket-1',
      organizationId: 'org-1',
    };

    vi.mocked(ticketsService.findOne).mockResolvedValue(ticket);

    const result = await gateway.resolveTicketForSocket(
      socket as never,
      'ticket-1',
    );

    expect(result).toBe(ticket);

    expect(ticketsService.findOne).toHaveBeenCalledWith(
      socket.data.auth.organization,
      'ticket-1',
    );
  });

  it('should enforce realtime ticket access through TicketsService', async () => {
    const { gateway, ticketsService } = createGateway();

    const socket = createAuthenticatedSocket('user-1', 'org-1');

    const ticket = {
      id: 'ticket-1',
      organizationId: 'org-1',
    };

    vi.mocked(ticketsService.assertRealtimeAccess).mockResolvedValue(ticket);

    const result = await gateway.assertTicketAccessForSocket(
      socket as never,
      'ticket-1',
    );

    expect(result).toBe(ticket);

    expect(ticketsService.assertRealtimeAccess).toHaveBeenCalledWith(
      socket.data.auth.organization,
      'ticket-1',
    );
  });

  it('should reject ticket authorization when organization context is missing', async () => {
    const { gateway } = createGateway();

    const socket = {
      id: 'socket-1',
      data: {
        auth: {
          user: {
            id: 'user-1',
          },
        },
      },
    };

    await expect(
      gateway.assertTicketAccessForSocket(socket as never, 'ticket-1'),
    ).rejects.toThrow('Organization context is required');
  });
});
