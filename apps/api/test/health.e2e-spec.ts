import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';

describe('Health API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health should return 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toBeDefined();
  });
});
