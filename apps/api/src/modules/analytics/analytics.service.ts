import { Injectable } from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryService } from './analytics-query.service';
import type { AnalyticsQueryInput } from './analytics.types';

export interface AnalyticsFoundationMetadata {
  dataSource: 'tickets';

  organizationScoped: true;

  queryVersion: 1;

  dateField: 'createdAt' | 'updatedAt';

  dateFrom: string | null;
  dateTo: string | null;

  dimensions: {
    status: string | null;
    priority: string | null;
    type: string | null;

    teamId: string | null;
    assigneeId: string | null;
    requesterId: string | null;

    unassigned: boolean | null;
    unassignedTeam: boolean | null;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly queryService: AnalyticsQueryService,
  ) {}

  async getFoundation(
    context: OrganizationContext,
    input: AnalyticsQueryInput = {},
  ) {
    const query = this.queryService.normalize(context, input);

    const where = this.queryService.buildTicketWhere(query);

    const [aggregate] = await this.database.$queryRaw<Array<{ total: number }>>`
        SELECT
          COUNT(*)::int AS "total"
        FROM "Ticket"
        WHERE ${where}
      `;

    const total = Number(aggregate?.total ?? 0);

    const tickets = await this.database.$queryRaw<
      Array<{
        id: string;
        ticketNumber: string;
        title: string;
        status: string;
        priority: string;
        type: string;

        teamId: string | null;
        teamName: string | null;

        assigneeId: string | null;
        assigneeName: string | null;

        createdAt: Date;
        updatedAt: Date;
      }>
    >`
        SELECT
          "Ticket"."id",
          "Ticket"."ticketNumber",
          "Ticket"."title",
          "Ticket"."status",
          "Ticket"."priority",
          "Ticket"."type",

          "Ticket"."teamId",
          "Team"."name" AS "teamName",

          "Ticket"."assigneeId",
          "Assignee"."name" AS "assigneeName",

          "Ticket"."createdAt",
          "Ticket"."updatedAt"

        FROM "Ticket"

        LEFT JOIN "Team"
          ON "Team"."id" = "Ticket"."teamId"

        LEFT JOIN "user" AS "Assignee"
          ON "Assignee"."id" = "Ticket"."assigneeId"

        WHERE ${where}

        ORDER BY
          ${this.queryService.buildTicketOrderBy(query)}

        LIMIT ${query.limit}
        OFFSET ${this.queryService.offset(query)}
      `;

    return {
      data: {
        total,

        tickets: tickets.map((ticket) => ({
          id: ticket.id,
          ticketNumber: ticket.ticketNumber,
          title: ticket.title,
          status: ticket.status,
          priority: ticket.priority,
          type: ticket.type,

          team: ticket.teamId
            ? {
                id: ticket.teamId,
                name: ticket.teamName,
              }
            : null,

          assignee: ticket.assigneeId
            ? {
                id: ticket.assigneeId,
                name: ticket.assigneeName,
              }
            : null,

          createdAt: ticket.createdAt.toISOString(),

          updatedAt: ticket.updatedAt.toISOString(),
        })),
      },

      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),

        query: this.toMetadata(query),
      },
    };
  }

  private toMetadata(
    query: ReturnType<AnalyticsQueryService['normalize']>,
  ): AnalyticsFoundationMetadata {
    return {
      dataSource: 'tickets',

      organizationScoped: true,

      queryVersion: 1,

      dateField: query.dateField,

      dateFrom: query.dateRange.from?.toISOString() ?? null,

      dateTo: query.dateRange.to?.toISOString() ?? null,

      dimensions: {
        status: query.dimensions.status ?? null,

        priority: query.dimensions.priority ?? null,

        type: query.dimensions.type ?? null,

        teamId: query.dimensions.teamId ?? null,

        assigneeId: query.dimensions.assigneeId ?? null,

        requesterId: query.dimensions.requesterId ?? null,

        unassigned: query.dimensions.unassigned ?? null,

        unassignedTeam: query.dimensions.unassignedTeam ?? null,
      },
    };
  }
}
