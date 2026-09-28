import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';

import { DatabaseService } from '../../src/database/database.service.js';

interface TestUser {
  id: string;
  name: string;
  email: string;
  password: string;
}

interface AuthenticatedTestUser {
  user: TestUser;
  agent: ReturnType<typeof request.agent>;
  cookies: string[];
}

export async function createAuthenticatedTestUser(
  app: INestApplication,
): Promise<AuthenticatedTestUser> {
  const agent = request.agent(app.getHttpServer());

  const user: TestUser = {
    name: 'API Test User',
    email: `api-test-${randomUUID()}@example.com`,
    password: 'TestPassword123!',
  };

  const signUpResponse = await agent
    .post('/api/v1/auth/sign-up/email')
    .send({
      name: user.name,
      email: user.email,
      password: user.password,
    })
    .expect(200);

  const userId = signUpResponse.body?.user?.id;

  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('Authenticated test user ID was not returned by sign-up');
  }

  const authenticatedUser: TestUser = {
    ...user,
    id: userId,
  };

  const signInResponse = await agent
    .post('/api/v1/auth/sign-in/email')
    .send({
      email: user.email,
      password: user.password,
    })
    .expect(200);

  const cookies = signInResponse.headers['set-cookie'] ?? [];

  return {
    user: authenticatedUser,
    agent,
    cookies,
  };
}

export async function deleteTestUser(
  app: INestApplication,
  email: string,
): Promise<void> {
  const database = app.get(DatabaseService);

  await database.user.deleteMany({
    where: {
      email,
    },
  });
}
