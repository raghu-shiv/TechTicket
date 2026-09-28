import { INestApplication } from '@nestjs/common';
import { io } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { createOrganizationTestFixture } from './helpers/organization.helper.js';

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
      socket.on('connect_error', resolve);
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
      socket.on('connect_error', resolve);
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
});
