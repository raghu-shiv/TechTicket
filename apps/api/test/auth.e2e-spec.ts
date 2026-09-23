import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import { createAuthenticatedTestUser } from './helpers/auth.helper.js';

describe('Authentication API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  // authentication tests here
  it('GET /api/v1/organizations should reject unauthenticated requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .expect(401);

    expect(response.body).toMatchObject({
      message: 'Authentication required',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('GET /api/v1/organizations should reject an invalid session', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/organizations')
      .set('Cookie', 'better-auth.session_token=invalid-session-token')
      .expect(401);

    expect(response.body).toMatchObject({
      message: 'Authentication required',
      error: 'Unauthorized',
      statusCode: 401,
    });
  });

  it('GET /api/v1/organizations should accept a valid Better Auth session', async () => {
    const { agent, user } = await createAuthenticatedTestUser(app);

    const response = await agent.get('/api/v1/organizations').expect(200);

    expect(response.body).toBeDefined();
    expect(user.email).toContain('@example.com');
  });
});
