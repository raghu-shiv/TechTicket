import { Injectable } from '@nestjs/common';
import { Prisma, TicketPriority } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { SlaDashboardView } from './dto/sla/sla-dashboard-query.dto';

interface DashboardQuery {
  view?: SlaDashboardView;
  page?: number;
  limit?: number;
  priority?: TicketPriority;
  teamId?: string;
  createdFrom?: string;
  createdTo?: string;
}

interface SlaDashboardAggregateRow {
  total: number;
  active: number;
  atRisk: number;
  breached: number;
  resolved: number;

  firstResponseCompleted: number;
  firstResponseCompliant: number;
  firstResponseBreached: number;

  resolutionCompleted: number;
  resolutionCompliant: number;
  resolutionBreached: number;
}

interface SlaDashboardTicketRow {
  id: string;
  ticketNumber: string;
  title: string;
  status: string;
  priority: string;
  teamId: string | null;
  teamName: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  createdAt: Date;
  resolvedAt: Date | null;

  firstResponseDueAt: Date;
  firstRespondedAt: Date | null;
  firstResponseBreachedAt: Date | null;

  resolutionDueAt: Date;
  resolutionBreachedAt: Date | null;
}

@Injectable()
export class SlaDashboardService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(context: OrganizationContext, query: DashboardQuery) {
    const now = new Date();

    const filters = this.buildFilters(query);

    const aggregate = await this.getAggregates(
      context.organizationId,
      now,
      filters,
    );

    const total = Number(aggregate.total);
    const firstResponseCompleted = Number(aggregate.firstResponseCompleted);
    const firstResponseCompliant = Number(aggregate.firstResponseCompliant);
    const resolutionCompleted = Number(aggregate.resolutionCompleted);
    const resolutionCompliant = Number(aggregate.resolutionCompliant);

    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    const tickets = await this.getTickets(context.organizationId, now, {
      ...query,
      view: query.view ?? SlaDashboardView.ALL,
      page,
      limit,
    });

    return {
      data: {
        metrics: {
          total: total,

          active: Number(aggregate.active),

          atRisk: Number(aggregate.atRisk),

          breached: Number(aggregate.breached),

          resolved: Number(aggregate.resolved),

          firstResponse: {
            completed: firstResponseCompleted,
            compliant: firstResponseCompliant,
            breached: Number(aggregate.firstResponseBreached),

            complianceRate:
              firstResponseCompleted === 0
                ? null
                : Number(
                    (
                      (firstResponseCompliant / firstResponseCompleted) *
                      100
                    ).toFixed(2),
                  ),
          },

          resolution: {
            completed: resolutionCompleted,
            compliant: resolutionCompliant,
            breached: Number(aggregate.resolutionBreached),

            complianceRate:
              resolutionCompleted === 0
                ? null
                : Number(
                    ((resolutionCompliant / resolutionCompleted) * 100).toFixed(
                      2,
                    ),
                  ),
          },
        },

        tickets: tickets.data,
      },

      meta: tickets.meta,
    };
  }

  private buildFilters(query: DashboardQuery): Prisma.Sql {
    const conditions: Prisma.Sql[] = [];

    if (query.priority) {
      conditions.push(
        Prisma.sql`"Ticket"."priority" = ${query.priority}::"TicketPriority"`,
      );
    }

    if (query.teamId) {
      conditions.push(Prisma.sql`"Ticket"."teamId" = ${query.teamId}`);
    }

    if (query.createdFrom) {
      conditions.push(
        Prisma.sql`"Ticket"."createdAt" >= ${new Date(query.createdFrom)}`,
      );
    }

    if (query.createdTo) {
      conditions.push(
        Prisma.sql`"Ticket"."createdAt" <= ${new Date(query.createdTo)}`,
      );
    }

    if (conditions.length === 0) {
      return Prisma.empty;
    }

    return Prisma.sql`AND ${Prisma.join(conditions, ' AND ')}`;
  }

  private async getAggregates(
    organizationId: string,
    now: Date,
    filters: Prisma.Sql,
  ): Promise<SlaDashboardAggregateRow> {
    const rows = await this.database.$queryRaw<SlaDashboardAggregateRow[]>`
      WITH sla AS (
        SELECT
          "Ticket"."id",
          "Ticket"."resolvedAt",
          "Ticket"."createdAt",

          "TicketSla"."firstResponseMinutes",
          "TicketSla"."resolutionMinutes",

          "TicketSla"."firstResponseDueAt",
          "TicketSla"."firstRespondedAt",
          "TicketSla"."firstResponseBreachedAt",

          "TicketSla"."resolutionDueAt",
          "TicketSla"."resolutionBreachedAt",

          CASE
            WHEN "TicketSla"."firstResponseBreachedAt" IS NOT NULL
              OR "TicketSla"."resolutionBreachedAt" IS NOT NULL
            THEN true
            ELSE false
          END AS "isBreached",

          CASE
            WHEN "Ticket"."resolvedAt" IS NOT NULL
            THEN true
            ELSE false
          END AS "isResolved",

          CASE
            WHEN
              "Ticket"."resolvedAt" IS NULL
              AND "TicketSla"."firstResponseBreachedAt" IS NULL
              AND "TicketSla"."resolutionBreachedAt" IS NULL
              AND (
                (
                  "TicketSla"."firstRespondedAt" IS NULL
                  AND "TicketSla"."firstResponseDueAt" > ${now}
                  AND (
                    EXTRACT(
                      EPOCH FROM (
                        "TicketSla"."firstResponseDueAt" - ${now}
                      )
                    ) * 1000
                    <=
                    "TicketSla"."firstResponseMinutes" * 60 * 1000 * 0.20
                  )
                )
                OR
                (
                  "Ticket"."resolvedAt" IS NULL
                  AND "TicketSla"."resolutionDueAt" > ${now}
                  AND (
                    EXTRACT(
                      EPOCH FROM (
                        "TicketSla"."resolutionDueAt" - ${now}
                      )
                    ) * 1000
                    <=
                    "TicketSla"."resolutionMinutes" * 60 * 1000 * 0.20
                  )
                )
              )
            THEN true
            ELSE false
          END AS "isAtRisk",

          CASE
            WHEN
              "Ticket"."resolvedAt" IS NULL
              AND "TicketSla"."firstResponseBreachedAt" IS NULL
              AND "TicketSla"."resolutionBreachedAt" IS NULL
              AND NOT (
                (
                  "TicketSla"."firstRespondedAt" IS NULL
                  AND "TicketSla"."firstResponseDueAt" > ${now}
                  AND (
                    EXTRACT(
                      EPOCH FROM (
                        "TicketSla"."firstResponseDueAt" - ${now}
                      )
                    ) * 1000
                    <=
                    "TicketSla"."firstResponseMinutes" * 60 * 1000 * 0.20
                  )
                )
                OR
                (
                  "TicketSla"."resolutionDueAt" > ${now}
                  AND (
                    EXTRACT(
                      EPOCH FROM (
                        "TicketSla"."resolutionDueAt" - ${now}
                      )
                    ) * 1000
                    <=
                    "TicketSla"."resolutionMinutes" * 60 * 1000 * 0.20
                  )
                )
              )
            THEN true
            ELSE false
          END AS "isActive"

        FROM "TicketSla"
        INNER JOIN "Ticket"
          ON "Ticket"."id" = "TicketSla"."ticketId"

        WHERE
          "Ticket"."organizationId" = ${organizationId}

          ${filters}
      )

      SELECT
        COUNT(*)::int AS "total",

        COUNT(*) FILTER (
          WHERE "isActive" = true
        )::int AS "active",

        COUNT(*) FILTER (
          WHERE "isAtRisk" = true
        )::int AS "atRisk",

        COUNT(*) FILTER (
          WHERE "isBreached" = true
        )::int AS "breached",

        COUNT(*) FILTER (
          WHERE "isResolved" = true
        )::int AS "resolved",

        COUNT(*) FILTER (
          WHERE "firstRespondedAt" IS NOT NULL
        )::int AS "firstResponseCompleted",

        COUNT(*) FILTER (
          WHERE
            "firstRespondedAt" IS NOT NULL
            AND "firstRespondedAt" <= "firstResponseDueAt"
        )::int AS "firstResponseCompliant",

        COUNT(*) FILTER (
          WHERE "firstResponseBreachedAt" IS NOT NULL
        )::int AS "firstResponseBreached",

        COUNT(*) FILTER (
          WHERE "resolvedAt" IS NOT NULL
        )::int AS "resolutionCompleted",

        COUNT(*) FILTER (
          WHERE
            "resolvedAt" IS NOT NULL
            AND "resolvedAt" <= "resolutionDueAt"
        )::int AS "resolutionCompliant",

        COUNT(*) FILTER (
          WHERE "resolutionBreachedAt" IS NOT NULL
        )::int AS "resolutionBreached"

      FROM sla
    `;

    return rows[0];
  }

  private async getTickets(
    organizationId: string,
    now: Date,
    query: DashboardQuery & {
      view: SlaDashboardView;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const offset = (page - 1) * limit;

    const filters = this.buildFilters(query);

    const viewFilter = this.buildViewFilter(query.view, now);

    const rows = await this.database.$queryRaw<SlaDashboardTicketRow[]>`
      SELECT
        "Ticket"."id",
        "Ticket"."ticketNumber",
        "Ticket"."title",
        "Ticket"."status",
        "Ticket"."priority",

        "Ticket"."teamId",
        "Team"."name" AS "teamName",

        "Ticket"."assigneeId",
        "Assignee"."name" AS "assigneeName",

        "Ticket"."createdAt",
        "Ticket"."resolvedAt",

        "TicketSla"."firstResponseDueAt",
        "TicketSla"."firstRespondedAt",
        "TicketSla"."firstResponseBreachedAt",

        "TicketSla"."resolutionDueAt",
        "TicketSla"."resolutionBreachedAt"

      FROM "TicketSla"

      INNER JOIN "Ticket"
        ON "Ticket"."id" = "TicketSla"."ticketId"

      LEFT JOIN "Team"
        ON "Team"."id" = "Ticket"."teamId"

      LEFT JOIN "user" AS "Assignee"
        ON "Assignee"."id" = "Ticket"."assigneeId"

      WHERE
        "Ticket"."organizationId" = ${organizationId}

        ${filters}

        ${viewFilter}

      ORDER BY "Ticket"."createdAt" DESC

      LIMIT ${limit}
      OFFSET ${offset}
    `;

    const countRows = await this.database.$queryRaw<Array<{ total: number }>>`
      SELECT COUNT(*)::int AS "total"

      FROM "TicketSla"

      INNER JOIN "Ticket"
        ON "Ticket"."id" = "TicketSla"."ticketId"

      WHERE
        "Ticket"."organizationId" = ${organizationId}

        ${filters}

        ${viewFilter}
    `;

    const total = Number(countRows[0]?.total ?? 0);

    return {
      data: rows.map((row) => ({
        id: row.id,
        ticketNumber: row.ticketNumber,
        title: row.title,
        status: row.status,
        priority: row.priority,

        team: row.teamId
          ? {
              id: row.teamId,
              name: row.teamName,
            }
          : null,

        assignee: row.assigneeId
          ? {
              id: row.assigneeId,
              name: row.assigneeName,
            }
          : null,

        createdAt: row.createdAt,
        resolvedAt: row.resolvedAt,

        firstResponse: {
          dueAt: row.firstResponseDueAt,
          respondedAt: row.firstRespondedAt,
          breachedAt: row.firstResponseBreachedAt,
        },

        resolution: {
          dueAt: row.resolutionDueAt,
          breachedAt: row.resolutionBreachedAt,
        },
      })),

      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private buildViewFilter(view: SlaDashboardView, now: Date): Prisma.Sql {
    const breached = Prisma.sql`
      (
        "TicketSla"."firstResponseBreachedAt" IS NOT NULL
        OR
        "TicketSla"."resolutionBreachedAt" IS NOT NULL
      )
    `;

    const resolved = Prisma.sql`
      "Ticket"."resolvedAt" IS NOT NULL
    `;

    const atRisk = Prisma.sql`
      (
        "Ticket"."resolvedAt" IS NULL

        AND "TicketSla"."firstResponseBreachedAt" IS NULL
        AND "TicketSla"."resolutionBreachedAt" IS NULL

        AND (
          (
            "TicketSla"."firstRespondedAt" IS NULL
            AND "TicketSla"."firstResponseDueAt" > ${now}
            AND (
              EXTRACT(
                EPOCH FROM (
                  "TicketSla"."firstResponseDueAt" - ${now}
                )
              ) * 1000
              <=
              "TicketSla"."firstResponseMinutes" * 60 * 1000 * 0.20
            )
          )

          OR

          (
            "TicketSla"."resolutionDueAt" > ${now}
            AND (
              EXTRACT(
                EPOCH FROM (
                  "TicketSla"."resolutionDueAt" - ${now}
                )
              ) * 1000
              <=
              "TicketSla"."resolutionMinutes" * 60 * 1000 * 0.20
            )
          )
        )
      )
    `;

    const active = Prisma.sql`
      (
        "Ticket"."resolvedAt" IS NULL

        AND NOT ${breached}

        AND NOT ${atRisk}
      )
    `;

    switch (view) {
      case SlaDashboardView.ACTIVE:
        return Prisma.sql`AND ${active}`;

      case SlaDashboardView.AT_RISK:
        return Prisma.sql`AND ${atRisk}`;

      case SlaDashboardView.BREACHED:
        return Prisma.sql`AND ${breached}`;

      case SlaDashboardView.RESOLVED:
        return Prisma.sql`AND ${resolved}`;

      case SlaDashboardView.FIRST_RESPONSE_BREACHED:
        return Prisma.sql`
          AND "TicketSla"."firstResponseBreachedAt" IS NOT NULL
        `;

      case SlaDashboardView.RESOLUTION_BREACHED:
        return Prisma.sql`
          AND "TicketSla"."resolutionBreachedAt" IS NOT NULL
        `;

      case SlaDashboardView.ALL:
      default:
        return Prisma.empty;
    }
  }
}
