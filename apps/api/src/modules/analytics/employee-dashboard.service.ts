import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole } from '@prisma/client';

import type { OrganizationContext } from '../../common/organization/organization.types';
import { DatabaseService } from '../../database/database.service';

import { AnalyticsQueryService } from './analytics-query.service';
import type { AnalyticsQueryInput } from './analytics.types';
import type { EmployeeDashboardQueryDto } from './dto/employee-dashboard-query.dto';
import type {
  EmployeeDashboardMetricPoint,
  EmployeeDashboardResponse,
  EmployeeDashboardResolutionTrendPoint,
  EmployeeDashboardRateMetric,
} from './employee-dashboard.types';

const ACTIVE_STATUSES = Prisma.sql`
  "Ticket"."status" IN (
    'OPEN'::"TicketStatus",
    'IN_PROGRESS'::"TicketStatus",
    'PENDING'::"TicketStatus"
  )
`;

interface QueryOptions {
  includeDates?: boolean;
  includeStatus?: boolean;
  includeTeam?: boolean;
  includeAssignmentFlags?: boolean;
}

function toAnalyticsInput(
  input: EmployeeDashboardQueryDto,
  assigneeId: string | undefined,
  options: QueryOptions = {},
): AnalyticsQueryInput {
  const includeDates = options.includeDates !== false;
  const includeStatus = options.includeStatus !== false;
  const includeTeam = options.includeTeam !== false;
  const includeAssignmentFlags = options.includeAssignmentFlags !== false;

  return {
    dateField: input.dateField as 'createdAt' | 'updatedAt',
    from: includeDates ? input.from : undefined,
    to: includeDates ? input.to : undefined,
    status: includeStatus ? input.status : undefined,
    priority: input.priority,
    type: input.type,
    teamId: includeTeam ? input.teamId : undefined,
    productId: input.productId,
    assigneeId,
    requesterId: input.requesterId,
    unassigned: includeAssignmentFlags ? input.unassigned : undefined,
    unassignedTeam: includeAssignmentFlags ? input.unassignedTeam : undefined,
  };
}

function nullableNumber(value: number | null | undefined): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function toRateMetric(
  completed: number,
  compliant: number,
  breached: number,
): EmployeeDashboardRateMetric {
  return {
    completed,
    compliant,
    breached,
    complianceRate:
      completed === 0
        ? null
        : Number(((compliant / completed) * 100).toFixed(1)),
  };
}

@Injectable()
export class EmployeeDashboardService {
  constructor(
    private readonly database: DatabaseService,
    private readonly queryService: AnalyticsQueryService,
  ) {}

  async getDashboard(
    context: OrganizationContext,
    input: EmployeeDashboardQueryDto,
  ): Promise<EmployeeDashboardResponse> {
    if (context.role === 'REQUESTER') {
      throw new ForbiddenException(
        'Employee performance analytics are not available to REQUESTER users',
      );
    }

    const canViewOrganization =
      context.role === 'OWNER' || context.role === 'ADMIN';

    const requestedEmployeeId = input.employeeId?.trim() || undefined;
    const requestedAssigneeId = input.assigneeId?.trim() || undefined;

    if (
      requestedEmployeeId &&
      requestedAssigneeId &&
      requestedEmployeeId !== requestedAssigneeId
    ) {
      throw new BadRequestException(
        'employeeId and assigneeId cannot identify different employees',
      );
    }

    const requestedSubjectId = requestedEmployeeId ?? requestedAssigneeId;
    let employeeId: string | undefined;

    if (!canViewOrganization) {
      // An AGENT is never allowed to widen the result set to another employee.
      if (requestedSubjectId && requestedSubjectId !== context.userId) {
        throw new ForbiddenException(
          'AGENT users can view employee analytics for themselves only',
        );
      }
      employeeId = context.userId;
    } else if (requestedSubjectId) {
      const employeeMembership = await this.database.membership.findFirst({
        where: {
          organizationId: context.organizationId,
          userId: requestedSubjectId,
          role: SystemRole.AGENT,
        },
        select: { userId: true },
      });

      if (!employeeMembership) {
        // Avoid disclosing whether a user exists in a different organization.
        throw new NotFoundException('Employee not found in this organization');
      }

      employeeId = employeeMembership.userId;
    }

    if (input.teamId?.trim()) {
      const team = await this.database.team.findFirst({
        where: {
          id: input.teamId.trim(),
          organizationId: context.organizationId,
          ...(!canViewOrganization
            ? { members: { some: { userId: context.userId } } }
            : {}),
        },
        select: { id: true },
      });

      if (!team) {
        // The same response covers foreign teams and teams outside an AGENT's scope.
        throw new NotFoundException('Team not found in the permitted scope');
      }
    }

    const normalizedInput = toAnalyticsInput(input, employeeId);
    const query = this.queryService.normalize(context, normalizedInput);
    const where = this.queryService.buildTicketWhere(query);

    // Current workload is a point-in-time operational count. It deliberately
    // ignores the selected date range and status filter, but keeps the other
    // supplied dimensions and the effective employee scope.
    const currentQuery = this.queryService.normalize(
      context,
      toAnalyticsInput(input, employeeId, {
        includeDates: false,
        includeStatus: false,
        includeAssignmentFlags: false,
      }),
    );
    const currentWhere = this.queryService.buildTicketWhere(currentQuery);

    // Trend and reopen events use event timestamps rather than the ticket
    // creation/update cohort. Remove date/status filters from the ticket side;
    // event-date boundaries are applied explicitly below.
    const eventQuery = this.queryService.normalize(
      context,
      toAnalyticsInput(input, employeeId, {
        includeDates: false,
        includeStatus: false,
        includeAssignmentFlags: false,
      }),
    );
    const eventWhere = this.queryService.buildTicketWhere(eventQuery);

    // Organization-level workload bars are only computed for OWNER/ADMIN.
    // An AGENT's comparison query is still explicitly scoped to that AGENT.
    const workloadAssigneeId = canViewOrganization ? undefined : context.userId;
    const workloadQuery = this.queryService.normalize(
      context,
      toAnalyticsInput(input, workloadAssigneeId, {
        includeDates: false,
        includeStatus: false,
        includeAssignmentFlags: false,
      }),
    );
    const workloadWhere = this.queryService.buildTicketWhere(workloadQuery);

    // Team comparison is organization-wide only for OWNER/ADMIN. The selected
    // team filter is removed for comparison so the user can compare teams.
    const teamComparisonQuery = this.queryService.normalize(
      context,
      toAnalyticsInput(input, undefined, {
        includeDates: false,
        includeStatus: false,
        includeTeam: false,
        includeAssignmentFlags: false,
      }),
    );
    const teamComparisonWhere =
      this.queryService.buildTicketWhere(teamComparisonQuery);

    const [summaryRows, currentWorkloadRows, reopenedRows, trendRows] =
      await Promise.all([
        this.database.$queryRaw<
          Array<{
            ticketCount: number;
            assignedTickets: number;
            openWorkload: number;
            resolvedTickets: number;
            slaTracked: number;
            slaBreached: number;
            firstResponseCompleted: number;
            firstResponseCompliant: number;
            firstResponseBreached: number;
            resolutionCompleted: number;
            resolutionCompliant: number;
            resolutionBreached: number;
            averageFirstResponseMinutes: number | null;
            averageResolutionMinutes: number | null;
          }>
        >`
          SELECT
            COUNT(*)::int AS "ticketCount",
            COUNT(*) FILTER (
              WHERE "Ticket"."assigneeId" IS NOT NULL
            )::int AS "assignedTickets",
            COUNT(*) FILTER (
              WHERE ${ACTIVE_STATUSES}
            )::int AS "openWorkload",
            COUNT(*) FILTER (
              WHERE "Ticket"."resolvedAt" IS NOT NULL
            )::int AS "resolvedTickets",

            COUNT("TicketSla"."id")::int AS "slaTracked",
            COUNT("TicketSla"."id") FILTER (
              WHERE
                "TicketSla"."firstResponseBreachedAt" IS NOT NULL
                OR "TicketSla"."resolutionBreachedAt" IS NOT NULL
            )::int AS "slaBreached",

            COUNT("TicketSla"."id") FILTER (
              WHERE "TicketSla"."firstRespondedAt" IS NOT NULL
            )::int AS "firstResponseCompleted",
            COUNT("TicketSla"."id") FILTER (
              WHERE
                "TicketSla"."firstRespondedAt" IS NOT NULL
                AND "TicketSla"."firstRespondedAt" <= "TicketSla"."firstResponseDueAt"
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
            )::int AS "resolutionBreached",

            AVG(
              EXTRACT(EPOCH FROM (
                "TicketSla"."firstRespondedAt" - "Ticket"."createdAt"
              )) / 60.0
            ) FILTER (
              WHERE
                "TicketSla"."firstRespondedAt" IS NOT NULL
                AND "TicketSla"."firstRespondedAt" >= "Ticket"."createdAt"
            ) AS "averageFirstResponseMinutes",
            AVG(
              EXTRACT(EPOCH FROM (
                "Ticket"."resolvedAt" - "Ticket"."createdAt"
              )) / 60.0
            ) FILTER (
              WHERE
                "Ticket"."resolvedAt" IS NOT NULL
                AND "Ticket"."resolvedAt" >= "Ticket"."createdAt"
            ) AS "averageResolutionMinutes"
          FROM "Ticket"
          LEFT JOIN "TicketSla"
            ON "TicketSla"."ticketId" = "Ticket"."id"
          WHERE ${where}
        `,

        this.database.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(*)::int AS "count"
          FROM "Ticket"
          WHERE ${currentWhere}
            AND ${ACTIVE_STATUSES}
            AND "Ticket"."assigneeId" IS NOT NULL
        `,

        this.database.$queryRaw<Array<{ count: number }>>`
          SELECT COUNT(DISTINCT "TicketActivity"."ticketId")::int AS "count"
          FROM "TicketActivity"
          INNER JOIN "Ticket"
            ON "Ticket"."id" = "TicketActivity"."ticketId"
            AND "Ticket"."organizationId" = "TicketActivity"."organizationId"
          WHERE ${eventWhere}
            AND "TicketActivity"."organizationId" = ${context.organizationId}
            AND "TicketActivity"."type" = 'STATUS_CHANGED'::"TicketActivityType"
            AND "TicketActivity"."metadata"->>'from' IN ('RESOLVED', 'CLOSED')
            AND "TicketActivity"."metadata"->>'to' IN ('IN_PROGRESS', 'PENDING')
            ${query.dateRange.from ? Prisma.sql`AND "TicketActivity"."createdAt" >= ${query.dateRange.from}` : Prisma.empty}
            ${query.dateRange.to ? Prisma.sql`AND "TicketActivity"."createdAt" <= ${query.dateRange.to}` : Prisma.empty}
        `,

        this.database.$queryRaw<
          Array<{
            date: Date;
            resolvedTickets: number;
            averageResolutionMinutes: number | null;
          }>
        >`
          SELECT
            date_trunc('day', "Ticket"."resolvedAt") AS "date",
            COUNT(*)::int AS "resolvedTickets",
            AVG(
              EXTRACT(EPOCH FROM (
                "Ticket"."resolvedAt" - "Ticket"."createdAt"
              )) / 60.0
            ) FILTER (
              WHERE "Ticket"."resolvedAt" >= "Ticket"."createdAt"
            ) AS "averageResolutionMinutes"
          FROM "Ticket"
          WHERE ${eventWhere}
            AND "Ticket"."resolvedAt" IS NOT NULL
            ${query.dateRange.from ? Prisma.sql`AND "Ticket"."resolvedAt" >= ${query.dateRange.from}` : Prisma.empty}
            ${query.dateRange.to ? Prisma.sql`AND "Ticket"."resolvedAt" <= ${query.dateRange.to}` : Prisma.empty}
          GROUP BY date_trunc('day', "Ticket"."resolvedAt")
          ORDER BY "date" ASC
          LIMIT 366
        `,
      ]);

    const summary = summaryRows[0];
    const tracked = Number(summary?.slaTracked ?? 0);
    const breached = Number(summary?.slaBreached ?? 0);
    const overallCompliant = Math.max(tracked - breached, 0);
    const firstResponseCompleted = Number(summary?.firstResponseCompleted ?? 0);
    const firstResponseCompliant = Number(summary?.firstResponseCompliant ?? 0);
    const firstResponseBreached = Number(summary?.firstResponseBreached ?? 0);
    const resolutionCompleted = Number(summary?.resolutionCompleted ?? 0);
    const resolutionCompliant = Number(summary?.resolutionCompliant ?? 0);
    const resolutionBreached = Number(summary?.resolutionBreached ?? 0);
    const currentWorkload = Number(currentWorkloadRows[0]?.count ?? 0);

    const resolutionTrend: EmployeeDashboardResolutionTrendPoint[] =
      trendRows.map((row) => ({
        date: row.date.toISOString(),
        resolvedTickets: Number(row.resolvedTickets),
        averageResolutionMinutes: nullableNumber(row.averageResolutionMinutes),
      }));

    const [availableEmployees, availableTeams, workloadRows, teamRows, self] =
      await Promise.all([
        canViewOrganization
          ? this.database.membership
              .findMany({
                where: {
                  organizationId: context.organizationId,
                  role: SystemRole.AGENT,
                },
                select: {
                  user: { select: { id: true, name: true } },
                },
              })
              .then((rows) =>
                rows
                  .map((row) => ({ id: row.user.id, name: row.user.name }))
                  .sort((a, b) => a.name.localeCompare(b.name)),
              )
          : Promise.resolve([] as Array<{ id: string; name: string }>),

        canViewOrganization
          ? this.database.team.findMany({
              where: { organizationId: context.organizationId },
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            })
          : this.database.teamMember
              .findMany({
                where: {
                  userId: context.userId,
                  team: { organizationId: context.organizationId },
                },
                select: {
                  team: { select: { id: true, name: true } },
                },
              })
              .then((rows) =>
                rows
                  .map((row) => row.team)
                  .sort((a, b) => a.name.localeCompare(b.name)),
              ),

        canViewOrganization
          ? this.database.$queryRaw<EmployeeDashboardMetricPoint[]>`
              SELECT
                "Membership"."userId" AS "id",
                "Employee"."name" AS "name",
                COUNT("Ticket"."id")::int AS "count"
              FROM "Membership"
              INNER JOIN "user" AS "Employee"
                ON "Employee"."id" = "Membership"."userId"
              LEFT JOIN "Ticket"
                ON "Ticket"."assigneeId" = "Membership"."userId"
                AND ${workloadWhere}
                AND ${ACTIVE_STATUSES}
              WHERE
                "Membership"."organizationId" = ${context.organizationId}
                AND "Membership"."role" = 'AGENT'::"SystemRole"
              GROUP BY "Membership"."userId", "Employee"."name"
              ORDER BY "count" DESC, "Employee"."name" ASC
            `
          : Promise.resolve([] as EmployeeDashboardMetricPoint[]),

        canViewOrganization
          ? this.database.$queryRaw<EmployeeDashboardMetricPoint[]>`
              SELECT
                "Team"."id" AS "id",
                "Team"."name" AS "name",
                COUNT("Ticket"."id")::int AS "count"
              FROM "Team"
              LEFT JOIN "Ticket"
                ON "Ticket"."teamId" = "Team"."id"
                AND ${teamComparisonWhere}
                AND ${ACTIVE_STATUSES}
                AND "Ticket"."assigneeId" IS NOT NULL
              WHERE "Team"."organizationId" = ${context.organizationId}
              GROUP BY "Team"."id", "Team"."name"
              ORDER BY "count" DESC, "Team"."name" ASC
            `
          : Promise.resolve([] as EmployeeDashboardMetricPoint[]),

        !canViewOrganization
          ? this.database.membership.findUnique({
              where: {
                userId_organizationId: {
                  userId: context.userId,
                  organizationId: context.organizationId,
                },
              },
              select: {
                user: { select: { id: true, name: true } },
              },
            })
          : Promise.resolve(null),
      ]);

    const workloadDistribution: EmployeeDashboardMetricPoint[] =
      canViewOrganization
        ? workloadRows.map((row) => ({
            id: row.id,
            name: row.name,
            count: Number(row.count),
          }))
        : [
            {
              id: context.userId,
              name: self?.user.name ?? 'My workload',
              count: currentWorkload,
            },
          ];

    return {
      data: {
        metrics: {
          ticketCount: Number(summary?.ticketCount ?? 0),
          assignedTickets: Number(summary?.assignedTickets ?? 0),
          openWorkload: Number(summary?.openWorkload ?? 0),
          resolvedTickets: Number(summary?.resolvedTickets ?? 0),
          currentWorkload,
          reopenedTickets: Number(reopenedRows[0]?.count ?? 0),
          averageFirstResponseMinutes: nullableNumber(
            summary?.averageFirstResponseMinutes,
          ),
          averageResolutionMinutes: nullableNumber(
            summary?.averageResolutionMinutes,
          ),
          sla: {
            tracked,
            breached,
            compliant: overallCompliant,
            complianceRate:
              tracked === 0
                ? null
                : Number(((overallCompliant / tracked) * 100).toFixed(1)),
            firstResponse: toRateMetric(
              firstResponseCompleted,
              firstResponseCompliant,
              firstResponseBreached,
            ),
            resolution: toRateMetric(
              resolutionCompleted,
              resolutionCompliant,
              resolutionBreached,
            ),
          },
        },
        resolutionTrend,
        workloadDistribution,
        teamComparison: canViewOrganization
          ? teamRows.map((row) => ({
              id: row.id,
              name: row.name,
              count: Number(row.count),
            }))
          : [],
        availableEmployees,
        availableTeams: availableTeams.map((team) => ({
          id: team.id,
          name: team.name,
        })),
      },
      meta: {
        organizationScoped: true,
        queryVersion: 1,
        accessScope: canViewOrganization
          ? employeeId
            ? 'EMPLOYEE'
            : 'ORGANIZATION'
          : 'SELF',
        employeeId: employeeId ?? null,
        dateField: query.dateField,
        dateFrom: query.dateRange.from?.toISOString() ?? null,
        dateTo: query.dateRange.to?.toISOString() ?? null,
        resolutionTrendDateField: 'resolvedAt',
        reopenDefinition:
          'Distinct tickets with a STATUS_CHANGED activity from RESOLVED or CLOSED to IN_PROGRESS or PENDING inside the selected event-date window.',
        currentWorkloadAsOf: new Date().toISOString(),
      },
    };
  }
}
