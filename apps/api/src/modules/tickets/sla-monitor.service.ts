import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron } from '@nestjs/schedule';

import { DatabaseService } from '../../database/database.service';

@Injectable()
export class SlaMonitorService {
  private readonly logger = new Logger(SlaMonitorService.name);

  constructor(
    private readonly database: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron('*/30 * * * * *', {
    name: 'sla-breach-monitor',
    waitForCompletion: true,
  })
  async detectBreaches(): Promise<void> {
    const now = new Date();

    const firstResponseBreaches = await this.database.ticketSla.updateMany({
      where: {
        firstRespondedAt: null,
        firstResponseBreachedAt: null,
        firstResponseDueAt: {
          lte: now,
        },
      },
      data: {
        firstResponseBreachedAt: now,
      },
    });

    if (firstResponseBreaches.count > 0) {
      this.logger.warn(
        `Detected ${firstResponseBreaches.count} first-response SLA breach(es).`,
      );

      const breachedSlas = await this.database.ticketSla.findMany({
        where: {
          firstResponseBreachedAt: now,
        },
        select: {
          id: true,
          ticketId: true,
        },
      });

      const escalations = await this.database.slaEscalation.createMany({
        data: breachedSlas.map((sla) => ({
          ticketId: sla.ticketId,
          ticketSlaId: sla.id,
          type: 'FIRST_RESPONSE_BREACH',
        })),
        skipDuplicates: true,
      });

      if (escalations.count > 0) {
        for (const sla of breachedSlas) {
          const escalation = await this.database.slaEscalation.findUnique({
            where: {
              ticketSlaId_type: {
                ticketSlaId: sla.id,
                type: 'FIRST_RESPONSE_BREACH',
              },
            },
            select: {
              id: true,
              ticketId: true,
              ticketSlaId: true,
              type: true,
              createdAt: true,
            },
          });

          if (escalation) {
            this.eventEmitter.emit('ticket.sla.first_response_breached', {
              escalationId: escalation.id,
              ticketId: escalation.ticketId,
              ticketSlaId: escalation.ticketSlaId,
              type: escalation.type,
              occurredAt: escalation.createdAt,
            });
          }
        }
      }
    }

    const resolutionBreaches = await this.database.ticketSla.updateMany({
      where: {
        resolutionBreachedAt: null,
        resolutionDueAt: {
          lte: now,
        },
        ticket: {
          resolvedAt: null,
        },
      },
      data: {
        resolutionBreachedAt: now,
      },
    });

    if (resolutionBreaches.count > 0) {
      this.logger.warn(
        `Detected ${resolutionBreaches.count} resolution SLA breach(es).`,
      );

      const breachedSlas = await this.database.ticketSla.findMany({
        where: {
          resolutionBreachedAt: now,
        },
        select: {
          id: true,
          ticketId: true,
        },
      });

      const escalations = await this.database.slaEscalation.createMany({
        data: breachedSlas.map((sla) => ({
          ticketId: sla.ticketId,
          ticketSlaId: sla.id,
          type: 'RESOLUTION_BREACH',
        })),
        skipDuplicates: true,
      });

      if (escalations.count > 0) {
        for (const sla of breachedSlas) {
          const escalation = await this.database.slaEscalation.findUnique({
            where: {
              ticketSlaId_type: {
                ticketSlaId: sla.id,
                type: 'RESOLUTION_BREACH',
              },
            },
            select: {
              id: true,
              ticketId: true,
              ticketSlaId: true,
              type: true,
              createdAt: true,
            },
          });

          if (escalation) {
            this.eventEmitter.emit('ticket.sla.resolution_breached', {
              escalationId: escalation.id,
              ticketId: escalation.ticketId,
              ticketSlaId: escalation.ticketSlaId,
              type: escalation.type,
              occurredAt: escalation.createdAt,
            });
          }
        }
      }
    }
  }
}
