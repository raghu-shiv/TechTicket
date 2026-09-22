export const configuration = {
  app: {
    name: 'TechTicket API',
    environment: process.env.NODE_ENV ?? 'development',
    port: Number(process.env.PORT ?? 4000),
  },

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  redis: {
    url: process.env.REDIS_URL ?? '',
  },
} as const;
