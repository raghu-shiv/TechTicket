import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';

@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get()
  async check() {
    try {
      await this.database.$queryRaw`SELECT 1`;

      return {
        success: true,
        data: {
          status: 'ok',
          service: 'tech-ticket-api',
          database: 'ok',
          timestamp: new Date().toISOString(),
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        success: false,
        data: {
          status: 'degraded',
          service: 'tech-ticket-api',
          database: 'unavailable',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
