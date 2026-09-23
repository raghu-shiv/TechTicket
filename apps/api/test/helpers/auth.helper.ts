import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { DatabaseService } from '../../src/database/database.service.js';

interface TestUser {
  name: string;
  email: string;
  password: string;
}

interface AuthenticatedTestUser {
  user: TestUser;
  agent: ReturnType<typeof request.agent>;
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

  await agent.post('/api/v1/auth/sign-up/email').send(user).expect(200);

  await agent
    .post('/api/v1/auth/sign-in/email')
    .send({
      email: user.email,
      password: user.password,
    })
    .expect(200);

  return {
    user,
    agent,
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
