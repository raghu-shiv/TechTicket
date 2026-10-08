import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryService } from './analytics-query.service';
import type { AnalyticsQueryInput } from './analytics.types';

import type {
  SlaReportAssigneePoint,
  SlaReportPriorityPoint,
  SlaReportResponse,
  SlaReportTeamPoint,
  SlaReportTrendPoint,
} from './sla-report.types';

import type {
  AnalyticsDashboardDistributionPoint,
  AnalyticsDashboardResponse,
  AnalyticsDashboardVolumePoint,
  AnalyticsDashboardWorkloadPoint,
} from './analytics-dashboard.types';

import type {
  ProductAnalyticsProduct,
  ProductAnalyticsResponse,
  ProductAnalyticsTrendPoint,
} from './product-analytics.types';

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

  async getProductAnalytics(
    context: OrganizationContext,
    input: AnalyticsQueryInput = {},
  ): Promise<ProductAnalyticsResponse> {
    const query = this.queryService.normalize(context, input);

    const baseWhere = this.queryService.buildTicketWhere(query);

    const dateColumn =
      query.dateField === 'updatedAt'
        ? Prisma.sql`"Ticket"."updatedAt"`
        : Prisma.sql`"Ticket"."createdAt"`;

    const productWhere = Prisma.sql`
  "Product"."organizationId" = ${query.organizationId}
`;

    const [summaryResult, productRows, priorityRows, trendRows] =
      await Promise.all([
        this.database.$queryRaw<
          Array<{
            totalTickets: number;
            activeTickets: number;
            resolvedClosedTickets: number;
            productsWithTickets: number;
            slaTracked: number;
            slaBreached: number;
            averageResolutionMinutes: number | null;
            medianResolutionMinutes: number | null;
          }>
        >`
        SELECT
          COUNT("Ticket"."id")::int AS "totalTickets",

          COUNT(*) FILTER (
            WHERE "Ticket"."status" IN (
              'OPEN'::"TicketStatus",
              'IN_PROGRESS'::"TicketStatus",
              'PENDING'::"TicketStatus"
            )
          )::int AS "activeTickets",

          COUNT(*) FILTER (
            WHERE "Ticket"."status" IN (
              'RESOLVED'::"TicketStatus",
              'CLOSED'::"TicketStatus"
            )
          )::int AS "resolvedClosedTickets",

          COUNT(DISTINCT "Ticket"."productId")
            FILTER (
              WHERE "Ticket"."productId" IS NOT NULL
            )::int AS "productsWithTickets",

          COUNT("TicketSla"."id")::int AS "slaTracked",

          COUNT("TicketSla"."id") FILTER (
            WHERE
              "TicketSla"."firstResponseBreachedAt" IS NOT NULL
              OR
              "TicketSla"."resolutionBreachedAt" IS NOT NULL
          )::int AS "slaBreached",

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

        WHERE ${baseWhere}
      `,

        this.database.$queryRaw<
          Array<{
            id: string;
            name: string;
            isActive: boolean;

            ticketVolume: number;
            activeTickets: number;
            resolvedClosedTickets: number;

            slaTracked: number;
            slaBreached: number;

            averageResolutionMinutes: number | null;
            medianResolutionMinutes: number | null;
          }>
        >`
        SELECT
          "Product"."id",
          "Product"."name",
          "Product"."isActive",

          COUNT("Ticket"."id")::int AS "ticketVolume",

          COUNT("Ticket"."id") FILTER (
            WHERE "Ticket"."status" IN (
              'OPEN'::"TicketStatus",
              'IN_PROGRESS'::"TicketStatus",
              'PENDING'::"TicketStatus"
            )
          )::int AS "activeTickets",

          COUNT("Ticket"."id") FILTER (
            WHERE "Ticket"."status" IN (
              'RESOLVED'::"TicketStatus",
              'CLOSED'::"TicketStatus"
            )
          )::int AS "resolvedClosedTickets",

          COUNT("TicketSla"."id")::int AS "slaTracked",

          COUNT("TicketSla"."id") FILTER (
            WHERE
              "TicketSla"."firstResponseBreachedAt" IS NOT NULL
              OR
              "TicketSla"."resolutionBreachedAt" IS NOT NULL
          )::int AS "slaBreached",

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

        FROM "Product"

        LEFT JOIN "Ticket"
          ON "Ticket"."productId" = "Product"."id"
          AND ${baseWhere}

        LEFT JOIN "TicketSla"
          ON "TicketSla"."ticketId" = "Ticket"."id"

        WHERE ${productWhere}

        GROUP BY
          "Product"."id",
          "Product"."name",
          "Product"."isActive"

        ORDER BY
          "ticketVolume" DESC,
          "Product"."name" ASC
      `,

        this.database.$queryRaw<
          Array<{
            productId: string;
            priority: string;
            count: number;
          }>
        >`
        SELECT
          "Ticket"."productId",
          "Ticket"."priority"::text AS "priority",
          COUNT(*)::int AS "count"
        FROM "Ticket"
        WHERE
          ${baseWhere}
          AND "Ticket"."productId" IS NOT NULL
        GROUP BY
          "Ticket"."productId",
          "Ticket"."priority"
      `,

        this.database.$queryRaw<
          Array<{
            productId: string;
            date: Date;
            count: number;
          }>
        >`
        SELECT
          "Ticket"."productId",
          date_trunc('day', ${dateColumn}) AS "date",
          COUNT(*)::int AS "count"
        FROM "Ticket"
        WHERE
          ${baseWhere}
          AND "Ticket"."productId" IS NOT NULL
        GROUP BY
          "Ticket"."productId",
          date_trunc('day', ${dateColumn})
        ORDER BY
          "date" ASC
      `,
      ]);

    const summary = summaryResult[0];

    const priorityByProduct = new Map<
      string,
      Array<{
        key: string;
        count: number;
      }>
    >();

    for (const row of priorityRows) {
      const existing = priorityByProduct.get(row.productId) ?? [];

      existing.push({
        key: row.priority,
        count: Number(row.count),
      });

      priorityByProduct.set(row.productId, existing);
    }

    const trendByProduct = new Map<string, ProductAnalyticsTrendPoint[]>();

    for (const row of trendRows) {
      const existing = trendByProduct.get(row.productId) ?? [];

      existing.push({
        date: row.date.toISOString(),
        count: Number(row.count),
      });

      trendByProduct.set(row.productId, existing);
    }

    const products: ProductAnalyticsProduct[] = productRows.map((row) => {
      const priorities = priorityByProduct.get(row.id) ?? [];

      const priorityTotal = priorities.reduce(
        (sum, item) => sum + item.count,
        0,
      );

      return {
        id: row.id,
        name: row.name,
        isActive: row.isActive,

        ticketVolume: Number(row.ticketVolume),
        activeTickets: Number(row.activeTickets),
        resolvedClosedTickets: Number(row.resolvedClosedTickets),

        priorityDistribution: priorities.map((item) => ({
          key: item.key,
          label: item.key.replaceAll('_', ' '),
          count: item.count,
          percentage:
            priorityTotal === 0
              ? 0
              : Number(((item.count / priorityTotal) * 100).toFixed(1)),
        })),

        sla: {
          tracked: Number(row.slaTracked),
          breached: Number(row.slaBreached),
          compliant: Math.max(
            Number(row.slaTracked) - Number(row.slaBreached),
            0,
          ),
          complianceRate:
            Number(row.slaTracked) === 0
              ? null
              : Number(
                  (
                    (Math.max(
                      Number(row.slaTracked) - Number(row.slaBreached),
                      0,
                    ) /
                      Number(row.slaTracked)) *
                    100
                  ).toFixed(1),
                ),
        },

        tat: {
          resolved: Number(row.resolvedClosedTickets),
          averageResolutionMinutes:
            row.averageResolutionMinutes === null
              ? null
              : Number(row.averageResolutionMinutes),
          medianResolutionMinutes:
            row.medianResolutionMinutes === null
              ? null
              : Number(row.medianResolutionMinutes),
        },

        trend: trendByProduct.get(row.id) ?? [],
      };
    });

    const slaTracked = Number(summary?.slaTracked ?? 0);
    const slaBreached = Number(summary?.slaBreached ?? 0);

    return {
      data: {
        summary: {
          totalTickets: Number(summary?.totalTickets ?? 0),
          activeTickets: Number(summary?.activeTickets ?? 0),
          resolvedClosedTickets: Number(summary?.resolvedClosedTickets ?? 0),
          productsWithTickets: Number(summary?.productsWithTickets ?? 0),

          slaTracked,
          slaBreached,
          slaComplianceRate:
            slaTracked === 0
              ? null
              : Number(
                  (
                    (Math.max(slaTracked - slaBreached, 0) / slaTracked) *
                    100
                  ).toFixed(1),
                ),

          averageResolutionMinutes:
            summary?.averageResolutionMinutes === null ||
            summary?.averageResolutionMinutes === undefined
              ? null
              : Number(summary.averageResolutionMinutes),

          medianResolutionMinutes:
            summary?.medianResolutionMinutes === null ||
            summary?.medianResolutionMinutes === undefined
              ? null
              : Number(summary.medianResolutionMinutes),
        },

        products,
      },

      meta: {
        query: {
          dateField: query.dateField,
          dateFrom: query.dateRange.from?.toISOString() ?? null,
          dateTo: query.dateRange.to?.toISOString() ?? null,
          productId: query.dimensions.productId ?? null,
          organizationScoped: true,
          queryVersion: 1,
        },
      },
    };
  }

  async getSlaReport(
    context: OrganizationContext,
    input: AnalyticsQueryInput = {},
  ): Promise<SlaReportResponse> {
    const query = this.queryService.normalize(context, input);

    const where = this.queryService.buildTicketWhere(query);

    const now = new Date();

    const dateColumn =
      query.dateField === 'updatedAt'
        ? Prisma.sql`"Ticket"."updatedAt"`
        : Prisma.sql`"Ticket"."createdAt"`;

    const [summaryRows, trendRows, priorityRows, teamRows, assigneeRows] =
      await Promise.all([
        this.database.$queryRaw<
          Array<{
            totalTracked: number;
            breached: number;
            active: number;
            atRisk: number;
            resolved: number;
            firstResponseCompleted: number;
            firstResponseCompliant: number;
            firstResponseBreached: number;
            resolutionCompleted: number;
            resolutionCompliant: number;
            resolutionBreached: number;
          }>
        >`
      WITH sla AS (
        SELECT
          "Ticket"."id",
          "Ticket"."resolvedAt",

          "TicketSla"."firstResponseMinutes",
          "TicketSla"."resolutionMinutes",

          "TicketSla"."firstResponseDueAt",
          "TicketSla"."firstRespondedAt",
          "TicketSla"."firstResponseBreachedAt",

          "TicketSla"."resolutionDueAt",
          "TicketSla"."resolutionBreachedAt",

          CASE
            WHEN
              "TicketSla"."firstResponseBreachedAt" IS NOT NULL
              OR
              "TicketSla"."resolutionBreachedAt" IS NOT NULL
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
                    "TicketSla"."firstResponseMinutes"
                    * 60
                    * 1000
                    * 0.20
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
                    "TicketSla"."resolutionMinutes"
                    * 60
                    * 1000
                    * 0.20
                  )
                )
              )

            THEN true
            ELSE false
          END AS "isAtRisk"

        FROM "TicketSla"

        INNER JOIN "Ticket"
          ON "Ticket"."id" = "TicketSla"."ticketId"

        WHERE ${where}
      )

      SELECT
        COUNT(*)::int AS "totalTracked",

        COUNT(*) FILTER (
          WHERE "isBreached" = true
        )::int AS "breached",

        COUNT(*) FILTER (
          WHERE "isAtRisk" = true
        )::int AS "atRisk",

        COUNT(*) FILTER (
          WHERE
            "isResolved" = false
            AND "isBreached" = false
            AND "isAtRisk" = false
        )::int AS "active",

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
            AND "firstResponseBreachedAt" IS NULL
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
            AND "resolutionBreachedAt" IS NULL
        )::int AS "resolutionCompliant",

        COUNT(*) FILTER (
          WHERE "resolutionBreachedAt" IS NOT NULL
        )::int AS "resolutionBreached"

      FROM sla
    `,

        this.database.$queryRaw<
          Array<{
            date: Date;

            tracked: number;

            breached: number;

            firstResponseCompleted: number;

            firstResponseCompliant: number;

            firstResponseBreached: number;

            resolutionCompleted: number;

            resolutionCompliant: number;

            resolutionBreached: number;
          }>
        >`
      SELECT
        date_trunc('day', ${dateColumn}) AS "date",

        COUNT("TicketSla"."id")::int AS "tracked",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstResponseBreachedAt" IS NOT NULL
            OR
            "TicketSla"."resolutionBreachedAt" IS NOT NULL
        )::int AS "breached",

        COUNT("TicketSla"."id") FILTER (
          WHERE "TicketSla"."firstRespondedAt" IS NOT NULL
        )::int AS "firstResponseCompleted",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstRespondedAt" IS NOT NULL
            AND "TicketSla"."firstRespondedAt"
              <= "TicketSla"."firstResponseDueAt"
            AND "TicketSla"."firstResponseBreachedAt" IS NULL
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
            AND "Ticket"."resolvedAt" <= "TicketSla"."resolutionDueAt"
            AND "TicketSla"."resolutionBreachedAt" IS NULL
        )::int AS "resolutionCompliant",

        COUNT("TicketSla"."id") FILTER (
          WHERE "TicketSla"."resolutionBreachedAt" IS NOT NULL
        )::int AS "resolutionBreached"

      FROM "TicketSla"

      INNER JOIN "Ticket"
        ON "Ticket"."id" = "TicketSla"."ticketId"

      WHERE ${where}

      GROUP BY date_trunc('day', ${dateColumn})

      ORDER BY "date" ASC

      LIMIT 366
    `,

        this.database.$queryRaw<
          Array<{
            priority: string;
            tracked: number;
            breached: number;
            atRisk: number;
            active: number;
            resolved: number;
            firstResponseCompleted: number;
            firstResponseCompliant: number;
            firstResponseBreached: number;
            resolutionCompleted: number;
            resolutionCompliant: number;
            resolutionBreached: number;
          }>
        >`
SELECT
  "Ticket"."priority"::text AS "priority",

  COUNT("TicketSla"."id")::int AS "tracked",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "TicketSla"."firstResponseBreachedAt" IS NOT NULL
      OR
      "TicketSla"."resolutionBreachedAt" IS NOT NULL
  )::int AS "breached",

  COUNT("TicketSla"."id") FILTER (
    WHERE
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
            "TicketSla"."firstResponseMinutes"
            * 60
            * 1000
            * 0.20
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
            "TicketSla"."resolutionMinutes"
            * 60
            * 1000
            * 0.20
          )
        )
      )
  )::int AS "atRisk",

  COUNT("TicketSla"."id") FILTER (
    WHERE
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
            "TicketSla"."firstResponseMinutes"
            * 60
            * 1000
            * 0.20
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
            "TicketSla"."resolutionMinutes"
            * 60
            * 1000
            * 0.20
          )
        )
      )
  )::int AS "active",

  COUNT("TicketSla"."id") FILTER (
    WHERE "Ticket"."resolvedAt" IS NOT NULL
  )::int AS "resolved",

  COUNT("TicketSla"."id") FILTER (
    WHERE "TicketSla"."firstRespondedAt" IS NOT NULL
  )::int AS "firstResponseCompleted",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "TicketSla"."firstRespondedAt" IS NOT NULL
      AND "TicketSla"."firstRespondedAt"
        <= "TicketSla"."firstResponseDueAt"
      AND "TicketSla"."firstResponseBreachedAt" IS NULL
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
      AND "Ticket"."resolvedAt"
        <= "TicketSla"."resolutionDueAt"
      AND "TicketSla"."resolutionBreachedAt" IS NULL
  )::int AS "resolutionCompliant",

  COUNT("TicketSla"."id") FILTER (
    WHERE "TicketSla"."resolutionBreachedAt" IS NOT NULL
  )::int AS "resolutionBreached"

FROM "TicketSla"

INNER JOIN "Ticket"
  ON "Ticket"."id" = "TicketSla"."ticketId"

WHERE ${where}

GROUP BY "Ticket"."priority"

ORDER BY
  CASE "Ticket"."priority"::text
    WHEN 'URGENT' THEN 1
    WHEN 'HIGH' THEN 2
    WHEN 'MEDIUM' THEN 3
    WHEN 'LOW' THEN 4
    ELSE 5
  END
`,

        this.database.$queryRaw<
          Array<{
            teamId: string | null;
            teamName: string | null;

            tracked: number;

            breached: number;

            atRisk: number;

            active: number;

            resolved: number;

            firstResponseCompleted: number;

            firstResponseCompliant: number;

            firstResponseBreached: number;

            resolutionCompleted: number;

            resolutionCompliant: number;

            resolutionBreached: number;
          }>
        >`
      SELECT
        "Team"."id" AS "teamId",

        "Team"."name" AS "teamName",

        COUNT("TicketSla"."id")::int AS "tracked",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstResponseBreachedAt" IS NOT NULL
            OR
            "TicketSla"."resolutionBreachedAt" IS NOT NULL
        )::int AS "breached",

        COUNT("TicketSla"."id") FILTER (
          WHERE
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
                  "TicketSla"."firstResponseMinutes"
                  * 60
                  * 1000
                  * 0.20
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
                  "TicketSla"."resolutionMinutes"
                  * 60
                  * 1000
                  * 0.20
                )
              )
            )
        )::int AS "atRisk",

        COUNT("TicketSla"."id") FILTER (
          WHERE
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
                  "TicketSla"."firstResponseMinutes"
                  * 60
                  * 1000
                  * 0.20
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
                  "TicketSla"."resolutionMinutes"
                  * 60
                  * 1000
                  * 0.20
                )
              )
            )
        )::int AS "active",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "Ticket"."resolvedAt" IS NOT NULL
        )::int AS "resolved",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstRespondedAt" IS NOT NULL
        )::int AS "firstResponseCompleted",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstRespondedAt" IS NOT NULL
            AND "TicketSla"."firstRespondedAt"
              <= "TicketSla"."firstResponseDueAt"
            AND "TicketSla"."firstResponseBreachedAt" IS NULL
        )::int AS "firstResponseCompliant",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."firstResponseBreachedAt" IS NOT NULL
        )::int AS "firstResponseBreached",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "Ticket"."resolvedAt" IS NOT NULL
        )::int AS "resolutionCompleted",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "Ticket"."resolvedAt" IS NOT NULL
            AND "Ticket"."resolvedAt"
              <= "TicketSla"."resolutionDueAt"
            AND "TicketSla"."resolutionBreachedAt" IS NULL
        )::int AS "resolutionCompliant",

        COUNT("TicketSla"."id") FILTER (
          WHERE
            "TicketSla"."resolutionBreachedAt" IS NOT NULL
        )::int AS "resolutionBreached"

      FROM "TicketSla"

      INNER JOIN "Ticket"
        ON "Ticket"."id" = "TicketSla"."ticketId"

      LEFT JOIN "Team"
        ON "Team"."id" = "Ticket"."teamId"
        AND "Team"."organizationId" = ${query.organizationId}

      WHERE ${where}

      GROUP BY
        "Team"."id",
        "Team"."name"

      ORDER BY
        CASE
          WHEN "Team"."id" IS NULL THEN 1
          ELSE 0
        END,
        "Team"."name" ASC NULLS LAST
      `,

        this.database.$queryRaw<
          Array<{
            assigneeId: string | null;
            assigneeName: string | null;

            tracked: number;

            breached: number;

            atRisk: number;

            active: number;

            resolved: number;

            firstResponseCompleted: number;

            firstResponseCompliant: number;

            firstResponseBreached: number;

            resolutionCompleted: number;

            resolutionCompliant: number;

            resolutionBreached: number;
          }>
        >`
SELECT
  "Assignee"."id" AS "assigneeId",

  "Assignee"."name" AS "assigneeName",

  COUNT("TicketSla"."id")::int AS "tracked",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "TicketSla"."firstResponseBreachedAt" IS NOT NULL
      OR
      "TicketSla"."resolutionBreachedAt" IS NOT NULL
  )::int AS "breached",

  COUNT("TicketSla"."id") FILTER (
    WHERE
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
            "TicketSla"."firstResponseMinutes"
            * 60
            * 1000
            * 0.20
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
            "TicketSla"."resolutionMinutes"
            * 60
            * 1000
            * 0.20
          )
        )
      )
  )::int AS "atRisk",

  COUNT("TicketSla"."id") FILTER (
    WHERE
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
            "TicketSla"."firstResponseMinutes"
            * 60
            * 1000
            * 0.20
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
            "TicketSla"."resolutionMinutes"
            * 60
            * 1000
            * 0.20
          )
        )
      )
  )::int AS "active",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "Ticket"."resolvedAt" IS NOT NULL
  )::int AS "resolved",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "TicketSla"."firstRespondedAt" IS NOT NULL
  )::int AS "firstResponseCompleted",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "TicketSla"."firstRespondedAt" IS NOT NULL
      AND "TicketSla"."firstRespondedAt"
        <= "TicketSla"."firstResponseDueAt"
      AND "TicketSla"."firstResponseBreachedAt" IS NULL
  )::int AS "firstResponseCompliant",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "TicketSla"."firstResponseBreachedAt" IS NOT NULL
  )::int AS "firstResponseBreached",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "Ticket"."resolvedAt" IS NOT NULL
  )::int AS "resolutionCompleted",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "Ticket"."resolvedAt" IS NOT NULL
      AND "Ticket"."resolvedAt"
        <= "TicketSla"."resolutionDueAt"
      AND "TicketSla"."resolutionBreachedAt" IS NULL
  )::int AS "resolutionCompliant",

  COUNT("TicketSla"."id") FILTER (
    WHERE
      "TicketSla"."resolutionBreachedAt" IS NOT NULL
  )::int AS "resolutionBreached"

FROM "TicketSla"

INNER JOIN "Ticket"
  ON "Ticket"."id" = "TicketSla"."ticketId"

LEFT JOIN "user" AS "Assignee"
  ON "Assignee"."id" = "Ticket"."assigneeId"
  AND EXISTS (
    SELECT 1
    FROM "Membership" AS "AssigneeMembership"
    WHERE
      "AssigneeMembership"."userId" = "Assignee"."id"
      AND "AssigneeMembership"."organizationId" = ${query.organizationId}
  )

WHERE ${where}

GROUP BY
  "Assignee"."id",
  "Assignee"."name"

ORDER BY
  CASE
    WHEN "Assignee"."id" IS NULL THEN 1
    ELSE 0
  END,
  "Assignee"."name" ASC NULLS LAST
`,
      ]);

    const aggregate = summaryRows[0];

    const totalTracked = Number(aggregate?.totalTracked ?? 0);

    const breached = Number(aggregate?.breached ?? 0);

    const atRisk = Number(aggregate?.atRisk ?? 0);

    const active = Number(aggregate?.active ?? 0);

    const resolved = Number(aggregate?.resolved ?? 0);

    const firstResponseCompleted = Number(
      aggregate?.firstResponseCompleted ?? 0,
    );

    const firstResponseCompliant = Number(
      aggregate?.firstResponseCompliant ?? 0,
    );

    const firstResponseBreached = Number(aggregate?.firstResponseBreached ?? 0);

    const resolutionCompleted = Number(aggregate?.resolutionCompleted ?? 0);

    const resolutionCompliant = Number(aggregate?.resolutionCompliant ?? 0);

    const resolutionBreached = Number(aggregate?.resolutionBreached ?? 0);

    const firstResponseComplianceRate =
      firstResponseCompleted === 0
        ? null
        : Number(
            ((firstResponseCompliant / firstResponseCompleted) * 100).toFixed(
              2,
            ),
          );

    const resolutionComplianceRate =
      resolutionCompleted === 0
        ? null
        : Number(
            ((resolutionCompliant / resolutionCompleted) * 100).toFixed(2),
          );

    const firstResponseBreachRate =
      firstResponseCompleted === 0
        ? null
        : Number(
            ((firstResponseBreached / firstResponseCompleted) * 100).toFixed(2),
          );

    const resolutionBreachRate =
      resolutionCompleted === 0
        ? null
        : Number(((resolutionBreached / resolutionCompleted) * 100).toFixed(2));

    const complianceGapPercentagePoints =
      firstResponseComplianceRate === null || resolutionComplianceRate === null
        ? null
        : Number(
            (firstResponseComplianceRate - resolutionComplianceRate).toFixed(2),
          );

    const breachGapPercentagePoints =
      firstResponseBreachRate === null || resolutionBreachRate === null
        ? null
        : Number((firstResponseBreachRate - resolutionBreachRate).toFixed(2));

    const trend: SlaReportTrendPoint[] = trendRows.map((row) => {
      const rowTracked = Number(row.tracked);

      const rowBreached = Number(row.breached);

      const rowFirstResponseCompleted = Number(row.firstResponseCompleted);

      const rowFirstResponseCompliant = Number(row.firstResponseCompliant);

      const rowFirstResponseBreached = Number(row.firstResponseBreached);

      const rowResolutionCompleted = Number(row.resolutionCompleted);

      const rowResolutionCompliant = Number(row.resolutionCompliant);

      const rowResolutionBreached = Number(row.resolutionBreached);

      return {
        date: row.date.toISOString(),

        tracked: rowTracked,

        breached: rowBreached,

        breachRate:
          rowTracked === 0
            ? 0
            : Number(((rowBreached / rowTracked) * 100).toFixed(2)),

        firstResponse: {
          completed: rowFirstResponseCompleted,

          compliant: rowFirstResponseCompliant,

          breached: rowFirstResponseBreached,

          complianceRate:
            rowFirstResponseCompleted === 0
              ? null
              : Number(
                  (
                    (rowFirstResponseCompliant / rowFirstResponseCompleted) *
                    100
                  ).toFixed(2),
                ),
        },

        resolution: {
          completed: rowResolutionCompleted,

          compliant: rowResolutionCompliant,

          breached: rowResolutionBreached,

          complianceRate:
            rowResolutionCompleted === 0
              ? null
              : Number(
                  (
                    (rowResolutionCompliant / rowResolutionCompleted) *
                    100
                  ).toFixed(2),
                ),
        },
      };
    });

    const byPriority: SlaReportPriorityPoint[] = priorityRows.map((row) => {
      const tracked = Number(row.tracked);

      const breached = Number(row.breached);

      const firstResponseCompleted = Number(row.firstResponseCompleted);

      const firstResponseCompliant = Number(row.firstResponseCompliant);

      const firstResponseBreached = Number(row.firstResponseBreached);

      const resolutionCompleted = Number(row.resolutionCompleted);

      const resolutionCompliant = Number(row.resolutionCompliant);

      const resolutionBreached = Number(row.resolutionBreached);

      return {
        key: row.priority,

        label: row.priority.replaceAll('_', ' '),

        tracked,

        breached,

        breachRate:
          tracked === 0 ? 0 : Number(((breached / tracked) * 100).toFixed(2)),

        atRisk: Number(row.atRisk),

        active: Number(row.active),

        resolved: Number(row.resolved),

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
                  ).toFixed(2),
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
                  ((resolutionCompliant / resolutionCompleted) * 100).toFixed(
                    2,
                  ),
                ),
        },
      };
    });

    const byTeam: SlaReportTeamPoint[] = teamRows.map((row) => {
      const tracked = Number(row.tracked);

      const breached = Number(row.breached);

      const firstResponseCompleted = Number(row.firstResponseCompleted);

      const firstResponseCompliant = Number(row.firstResponseCompliant);

      const firstResponseBreached = Number(row.firstResponseBreached);

      const resolutionCompleted = Number(row.resolutionCompleted);

      const resolutionCompliant = Number(row.resolutionCompliant);

      const resolutionBreached = Number(row.resolutionBreached);

      const isUnassigned = row.teamId === null;

      return {
        id: row.teamId,

        key: row.teamId ?? '__UNASSIGNED__',

        label: isUnassigned ? 'Unassigned' : (row.teamName ?? 'Unknown'),

        tracked,

        breached,

        breachRate:
          tracked === 0 ? 0 : Number(((breached / tracked) * 100).toFixed(2)),

        atRisk: Number(row.atRisk),

        active: Number(row.active),

        resolved: Number(row.resolved),

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
                  ).toFixed(2),
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
                  ((resolutionCompliant / resolutionCompleted) * 100).toFixed(
                    2,
                  ),
                ),
        },
      };
    });

    const byAssignee: SlaReportAssigneePoint[] = assigneeRows.map((row) => {
      const tracked = Number(row.tracked);

      const breached = Number(row.breached);

      const firstResponseCompleted = Number(row.firstResponseCompleted);

      const firstResponseCompliant = Number(row.firstResponseCompliant);

      const firstResponseBreached = Number(row.firstResponseBreached);

      const resolutionCompleted = Number(row.resolutionCompleted);

      const resolutionCompliant = Number(row.resolutionCompliant);

      const resolutionBreached = Number(row.resolutionBreached);

      const isUnassigned = row.assigneeId === null;

      return {
        id: row.assigneeId,

        key: row.assigneeId ?? '__UNASSIGNED__',

        label: isUnassigned ? 'Unassigned' : (row.assigneeName ?? 'Unknown'),

        tracked,

        breached,

        breachRate:
          tracked === 0 ? 0 : Number(((breached / tracked) * 100).toFixed(2)),

        atRisk: Number(row.atRisk),

        active: Number(row.active),

        resolved: Number(row.resolved),

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
                  ).toFixed(2),
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
                  ((resolutionCompliant / resolutionCompleted) * 100).toFixed(
                    2,
                  ),
                ),
        },
      };
    });

    return {
      data: {
        summary: {
          totalTracked,

          breached,

          atRisk,

          active,

          resolved,

          firstResponse: {
            completed: firstResponseCompleted,

            compliant: firstResponseCompliant,

            breached: firstResponseBreached,

            complianceRate: firstResponseComplianceRate,
          },

          resolution: {
            completed: resolutionCompleted,

            compliant: resolutionCompliant,

            breached: resolutionBreached,

            complianceRate: resolutionComplianceRate,
          },
        },

        comparison: {
          firstResponse: {
            completed: firstResponseCompleted,
            compliant: firstResponseCompliant,
            breached: firstResponseBreached,
            complianceRate: firstResponseComplianceRate,
            breachRate: firstResponseBreachRate,
          },

          resolution: {
            completed: resolutionCompleted,
            compliant: resolutionCompliant,
            breached: resolutionBreached,
            complianceRate: resolutionComplianceRate,
            breachRate: resolutionBreachRate,
          },

          complianceGapPercentagePoints,
          breachGapPercentagePoints,
        },

        trend,

        byPriority,

        byTeam,

        byAssignee,
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
