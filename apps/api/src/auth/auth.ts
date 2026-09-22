import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';

import { DatabaseService } from '../database/database.service';

const database = new DatabaseService();

export const auth = betterAuth({
  appName: 'TechTicket',

  database: prismaAdapter(database, {
    provider: 'postgresql',
  }),

  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4000',

  basePath: '/api/v1/auth',

  trustedOrigins: ['http://localhost:3000'],

  emailAndPassword: {
    enabled: true,
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },

  secret:
    process.env.BETTER_AUTH_SECRET ??
    'development-only-secret-change-this-32-chars',
});
