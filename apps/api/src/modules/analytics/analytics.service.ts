import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryService } from './analytics-query.service';
import type { AnalyticsQueryInput } from './analytics.types';

import type {
  AnalyticsDashboardDistributionPoint,
  AnalyticsDashboardResponse,
  AnalyticsDashboardVolumePoint,
  AnalyticsDashboardWorkloadPoint,
} from './analytics-dashboard.types';

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

  async getDashboard(
    context: OrganizationContext,
    input: AnalyticsQueryInput = {},
  ): Promise<AnalyticsDashboardResponse> {
    const query = this.queryService.normalize(context, input);

    const where = this.queryService.buildTicketWhere(query);

    const dateColumn =
      query.dateField === 'updatedAt'
        ? Prisma.sql`"Ticket"."updatedAt"`
        : Prisma.sql`"Ticket"."createdAt"`;

    const [
      metricsResult,
      volumeTrend,
      priorityDistribution,
      teamWorkload,
      assigneeWorkload,
    ] = await Promise.all([
      this.database.$queryRaw<
        Array<{
          total: number;
          active: number;
          resolvedClosed: number;
          unassigned: number;

          slaTracked: number;
          slaBreached: number;

          firstResponseCompleted: number;
          firstResponseCompliant: number;
          firstResponseBreached: number;

          resolutionCompleted: number;
          resolutionCompliant: number;
          resolutionBreached: number;

          tatResolved: number;
          averageResolutionMinutes: number | null;
          medianResolutionMinutes: number | null;
        }>
      >`
      SELECT
        COUNT(*)::int AS "total",

        COUNT(*) FILTER (
          WHERE "Ticket"."status" IN (
            'OPEN'::"TicketStatus",
            'IN_PROGRESS'::"TicketStatus",
            'PENDING'::"TicketStatus"
          )
        )::int AS "active",

        COUNT(*) FILTER (
          WHERE "Ticket"."status" IN (
            'RESOLVED'::"TicketStatus",
            'CLOSED'::"TicketStatus"
          )
        )::int AS "resolvedClosed",

        COUNT(*) FILTER (
          WHERE "Ticket"."assigneeId" IS NULL
        )::int AS "unassigned",

        COUNT("TicketSla"."id")::int AS "slaTracked",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstResponseBreachedAt" IS NOT NULL
            OR
            "TicketSla"."resolutionBreachedAt" IS NOT NULL
        )::int AS "slaBreached",

        COUNT("TicketSla"."id") FILTER (
          WHERE "TicketSla"."firstRespondedAt" IS NOT NULL
        )::int AS "firstResponseCompleted",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstRespondedAt" IS NOT NULL
            AND
            "TicketSla"."firstResponseBreachedAt" IS NULL
        )::int AS "firstResponseCompliant",

        COUNT("TicketSla"."id") FILTER (
          WHERE "TicketSla"."firstResponseBreachedAt" IS NOT NULL
        )::int AS "firstResponseBreached",

        COUNT("TicketSla"."id") FILTER (
          WHERE "Ticket"."resolvedAt" IS NOT NULL
        )::int AS "resolutionCompleted",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "Ticket"."resolvedAt" IS NOT NULL
            AND
            "TicketSla"."resolutionBreachedAt" IS NULL
        )::int AS "resolutionCompliant",

        COUNT("TicketSla"."id") FILTER (
          WHERE "TicketSla"."resolutionBreachedAt" IS NOT NULL
        )::int AS "resolutionBreached",

        COUNT(*) FILTER (
          WHERE "Ticket"."resolvedAt" IS NOT NULL
        )::int AS "tatResolved",

        AVG(
          EXTRACT(
            EPOCH FROM (
              "Ticket"."resolvedAt" - "Ticket"."createdAt"
            )
          ) / 60.0
        ) FILTER (
          WHERE "Ticket"."resolvedAt" IS NOT NULL
        ) AS "averageResolutionMinutes",

        percentile_cont(0.5) WITHIN GROUP (
          ORDER BY
            EXTRACT(
              EPOCH FROM (
                "Ticket"."resolvedAt" - "Ticket"."createdAt"
              )
            ) / 60.0
        ) FILTER (
          WHERE "Ticket"."resolvedAt" IS NOT NULL
        ) AS "medianResolutionMinutes"

      FROM "Ticket"

      LEFT JOIN "TicketSla"
        ON "TicketSla"."ticketId" = "Ticket"."id"

      WHERE ${where}
    `,

      this.database.$queryRaw<
        Array<{
          date: Date;
          count: number;
        }>
      >`
      SELECT
        date_trunc('day', ${dateColumn}) AS "date",
        COUNT(*)::int AS "count"
      FROM "Ticket"
      WHERE ${where}
      GROUP BY date_trunc('day', ${dateColumn})
      ORDER BY "date" ASC
      LIMIT 366
    `,

      this.database.$queryRaw<
        Array<{
          priority: string;
          count: number;
        }>
      >`
      SELECT
        "Ticket"."priority"::text AS "priority",
        COUNT(*)::int AS "count"
      FROM "Ticket"
      WHERE ${where}
      GROUP BY "Ticket"."priority"
      ORDER BY "count" DESC
    `,

      this.database.$queryRaw<
        Array<{
          id: string;
          name: string;
          count: number;
        }>
      >`
      SELECT
        "Team"."id",
        "Team"."name",
        COUNT("Ticket"."id")::int AS "count"
      FROM "Team"
      LEFT JOIN "Ticket"
        ON "Ticket"."teamId" = "Team"."id"
        AND ${where}
      WHERE "Team"."organizationId" = ${query.organizationId}
      GROUP BY
        "Team"."id",
        "Team"."name"
      ORDER BY "count" DESC
      LIMIT 10
    `,

      this.database.$queryRaw<
        Array<{
          id: string | null;
          name: string;
          count: number;
        }>
      >`
      SELECT
        "Assignee"."id",
        COALESCE("Assignee"."name", 'Unassigned') AS "name",
        COUNT("Ticket"."id")::int AS "count"
      FROM "Ticket"
      LEFT JOIN "user" AS "Assignee"
        ON "Assignee"."id" = "Ticket"."assigneeId"
      WHERE ${where}
      GROUP BY
        "Assignee"."id",
        "Assignee"."name"
      ORDER BY "count" DESC
      LIMIT 10
    `,
    ]);

    const metrics = metricsResult[0];

    const total = Number(metrics?.total ?? 0);

    const slaTracked = Number(metrics?.slaTracked ?? 0);
    const slaBreached = Number(metrics?.slaBreached ?? 0);
    const slaCompliant = Math.max(slaTracked - slaBreached, 0);

    const firstResponseCompleted = Number(metrics?.firstResponseCompleted ?? 0);

    const firstResponseCompliant = Number(metrics?.firstResponseCompliant ?? 0);

    const firstResponseBreached = Number(metrics?.firstResponseBreached ?? 0);

    const resolutionCompleted = Number(metrics?.resolutionCompleted ?? 0);

    const resolutionCompliant = Number(metrics?.resolutionCompliant ?? 0);

    const resolutionBreached = Number(metrics?.resolutionBreached ?? 0);

    const volume: AnalyticsDashboardVolumePoint[] = volumeTrend.map(
      (point) => ({
        date: point.date.toISOString(),
        count: Number(point.count),
      }),
    );

    const priorityTotal = priorityDistribution.reduce(
      (sum, point) => sum + Number(point.count),
      0,
    );

    const priority: AnalyticsDashboardDistributionPoint[] =
      priorityDistribution.map((point) => ({
        key: point.priority,
        label: point.priority.replaceAll('_', ' '),
        count: Number(point.count),
        percentage:
          priorityTotal === 0
            ? 0
            : Number(((Number(point.count) / priorityTotal) * 100).toFixed(1)),
      }));

    const teams: AnalyticsDashboardWorkloadPoint[] = teamWorkload.map(
      (team) => ({
        id: team.id,
        name: team.name,
        count: Number(team.count),
      }),
    );

    const assignees: AnalyticsDashboardWorkloadPoint[] = assigneeWorkload.map(
      (assignee) => ({
        id: assignee.id,
        name: assignee.name,
        count: Number(assignee.count),
      }),
    );

    return {
      data: {
        metrics: {
          total,
          active: Number(metrics?.active ?? 0),
          resolvedClosed: Number(metrics?.resolvedClosed ?? 0),
          unassigned: Number(metrics?.unassigned ?? 0),

          sla: {
            tracked: slaTracked,
            breached: slaBreached,
            compliant: slaCompliant,
            complianceRate:
              slaTracked === 0
                ? null
                : Number(((slaCompliant / slaTracked) * 100).toFixed(1)),

            firstResponse: {
              completed: firstResponseCompleted,
              compliant: firstResponseCompliant,
              breached: firstResponseBreached,
              complianceRate:
                firstResponseCompleted === 0
                  ? null
                  : Number(
                      (
                        (firstResponseCompliant / firstResponseCompleted) *
                        100
                      ).toFixed(1),
                    ),
            },

            resolution: {
              completed: resolutionCompleted,
              compliant: resolutionCompliant,
              breached: resolutionBreached,
              complianceRate:
                resolutionCompleted === 0
                  ? null
                  : Number(
                      (
                        (resolutionCompliant / resolutionCompleted) *
                        100
                      ).toFixed(1),
                    ),
            },
          },

          tat: {
            resolved: Number(metrics?.tatResolved ?? 0),
            averageResolutionMinutes:
              metrics?.averageResolutionMinutes === null ||
              metrics?.averageResolutionMinutes === undefined
                ? null
                : Number(metrics.averageResolutionMinutes),

            medianResolutionMinutes:
              metrics?.medianResolutionMinutes === null ||
              metrics?.medianResolutionMinutes === undefined
                ? null
                : Number(metrics.medianResolutionMinutes),
          },
        },

        volumeTrend: volume,

        priorityDistribution: priority,

        teamWorkload: teams,

        assigneeWorkload: assignees,
      },

      meta: {
        query: {
          dateField: query.dateField,
          dateFrom: query.dateRange.from?.toISOString() ?? null,
          dateTo: query.dateRange.to?.toISOString() ?? null,
          organizationScoped: true,
          queryVersion: 1,
        },
      },
    };
  }
}
