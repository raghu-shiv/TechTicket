import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';
import { UsageReportQueryDto } from './dto/usage-report-query.dto';
import type {
  UsageReportResponse,
  UsageReportSummary,
  UsageReportTrendPoint,
} from './usage-report.types';

@Injectable()
export class UsageReportService {
  constructor(private readonly database: DatabaseService) {}

  async getReport(
    context: OrganizationContext,
    query: UsageReportQueryDto,
  ): Promise<UsageReportResponse> {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;

    if (from && to && from.getTime() > to.getTime()) {
      throw new BadRequestException(
        '`from` must be earlier than or equal to `to`.',
      );
    }

    const organizationId = context.organizationId;

    const dateFilter = (column: Prisma.Sql) => Prisma.sql`
      ${from ? Prisma.sql`${column} >= ${from}` : Prisma.sql`TRUE`}
      AND
      ${to ? Prisma.sql`${column} <= ${to}` : Prisma.sql`TRUE`}
    `;

    const ticketDateFilter = dateFilter(Prisma.sql`"Ticket"."createdAt"`);
    const activityDateFilter = dateFilter(
      Prisma.sql`"TicketActivity"."createdAt"`,
    );
    const commentDateFilter = dateFilter(
      Prisma.sql`"TicketComment"."createdAt"`,
    );
    const attachmentDateFilter = dateFilter(
      Prisma.sql`"TicketAttachment"."createdAt"`,
    );
    const approvalRequestDateFilter = dateFilter(
      Prisma.sql`"TicketApproval"."requestedAt"`,
    );
    const approvalDateFilter = dateFilter(
      Prisma.sql`"TicketApproval"."approvedAt"`,
    );
    const rejectionDateFilter = dateFilter(
      Prisma.sql`"TicketApproval"."rejectedAt"`,
    );

    const [
      ticketCount,
      activityCount,
      commentCount,
      attachmentCount,
      approvalRequests,
      approvalsApproved,
      approvalsRejected,
      activeUserCount,
      activeAgentCount,
      trendRows,
    ] = await Promise.all([
      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "Ticket"
        WHERE "organizationId" = ${organizationId}
          AND ${ticketDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "TicketActivity"
        WHERE "organizationId" = ${organizationId}
          AND ${activityDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "TicketComment"
        INNER JOIN "Ticket"
          ON "Ticket"."id" = "TicketComment"."ticketId"
        WHERE "Ticket"."organizationId" = ${organizationId}
          AND ${commentDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "TicketAttachment"
        INNER JOIN "Ticket"
          ON "Ticket"."id" = "TicketAttachment"."ticketId"
        WHERE "Ticket"."organizationId" = ${organizationId}
          AND ${attachmentDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "TicketApproval"
        INNER JOIN "Ticket"
          ON "Ticket"."id" = "TicketApproval"."ticketId"
        WHERE "Ticket"."organizationId" = ${organizationId}
          AND ${approvalRequestDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "TicketApproval"
        INNER JOIN "Ticket"
          ON "Ticket"."id" = "TicketApproval"."ticketId"
        WHERE "Ticket"."organizationId" = ${organizationId}
          AND "TicketApproval"."status" = 'APPROVED'
          AND ${approvalDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "TicketApproval"
        INNER JOIN "Ticket"
          ON "Ticket"."id" = "TicketApproval"."ticketId"
        WHERE "Ticket"."organizationId" = ${organizationId}
          AND "TicketApproval"."status" = 'REJECTED'
          AND ${rejectionDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT "actorId")::int AS count
        FROM "TicketActivity"
        WHERE "organizationId" = ${organizationId}
          AND "actorId" IS NOT NULL
          AND ${activityDateFilter}
      `,

      this.database.$queryRaw<Array<{ count: number }>>`
        SELECT COUNT(DISTINCT activity."actorId")::int AS count
        FROM "TicketActivity" AS activity
        INNER JOIN "Membership" AS membership
          ON membership."userId" = activity."actorId"
         AND membership."organizationId" = activity."organizationId"
        WHERE activity."organizationId" = ${organizationId}
          AND membership."role" = 'AGENT'
          AND activity."actorId" IS NOT NULL
          AND ${dateFilter(Prisma.sql`activity."createdAt"`)}
      `,

      this.database.$queryRaw<UsageReportTrendPoint[]>`
        WITH events AS (
          SELECT
            DATE_TRUNC('day', "createdAt")::date AS day,
            COUNT(*)::int AS tickets_created,
            0::int AS activities,
            0::int AS comments,
            0::int AS attachments,
            0::int AS approval_requests
          FROM "Ticket"
          WHERE "organizationId" = ${organizationId}
            AND ${ticketDateFilter}
          GROUP BY 1

          UNION ALL

          SELECT
            DATE_TRUNC('day', "createdAt")::date,
            0::int,
            COUNT(*)::int,
            0::int,
            0::int,
            0::int
          FROM "TicketActivity"
          WHERE "organizationId" = ${organizationId}
            AND ${activityDateFilter}
          GROUP BY 1

          UNION ALL

          SELECT
            DATE_TRUNC('day', comment."createdAt")::date,
            0::int,
            0::int,
            COUNT(*)::int,
            0::int,
            0::int
          FROM "TicketComment" AS comment
          INNER JOIN "Ticket" AS ticket
            ON ticket."id" = comment."ticketId"
          WHERE ticket."organizationId" = ${organizationId}
            AND ${dateFilter(Prisma.sql`comment."createdAt"`)}
          GROUP BY 1

          UNION ALL

          SELECT
            DATE_TRUNC('day', attachment."createdAt")::date,
            0::int,
            0::int,
            0::int,
            COUNT(*)::int,
            0::int
          FROM "TicketAttachment" AS attachment
          INNER JOIN "Ticket" AS ticket
            ON ticket."id" = attachment."ticketId"
          WHERE ticket."organizationId" = ${organizationId}
            AND ${dateFilter(Prisma.sql`attachment."createdAt"`)}
          GROUP BY 1

          UNION ALL

          SELECT
            DATE_TRUNC('day', approval."requestedAt")::date,
            0::int,
            0::int,
            0::int,
            0::int,
            COUNT(*)::int
          FROM "TicketApproval" AS approval
          INNER JOIN "Ticket" AS ticket
            ON ticket."id" = approval."ticketId"
          WHERE ticket."organizationId" = ${organizationId}
            AND ${dateFilter(Prisma.sql`approval."requestedAt"`)}
          GROUP BY 1
        )
        SELECT
          TO_CHAR(day, 'YYYY-MM-DD') AS date,
          SUM(tickets_created)::int AS "ticketsCreated",
          SUM(activities)::int AS "activitiesRecorded",
          SUM(comments)::int AS "commentsCreated",
          SUM(attachments)::int AS "attachmentsUploaded",
          SUM(approval_requests)::int AS "approvalRequests"
        FROM events
        GROUP BY day
        ORDER BY day ASC
      `,
    ]);

    const summary: UsageReportSummary = {
      ticketsCreated: Number(ticketCount[0]?.count ?? 0),
      activitiesRecorded: Number(activityCount[0]?.count ?? 0),
      commentsCreated: Number(commentCount[0]?.count ?? 0),
      attachmentsUploaded: Number(attachmentCount[0]?.count ?? 0),
      approvalRequests: Number(approvalRequests[0]?.count ?? 0),
      approvalsApproved: Number(approvalsApproved[0]?.count ?? 0),
      approvalsRejected: Number(approvalsRejected[0]?.count ?? 0),
      activeUsers: Number(activeUserCount[0]?.count ?? 0),
      activeAgents: Number(activeAgentCount[0]?.count ?? 0),
    };

    return {
      summary,
      trends: this.fillMissingDays(trendRows, from, to),
      period: {
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      },
      metricAvailability: {
        notifications: 'unavailable',
      },
    };
  }

  private fillMissingDays(
    rows: UsageReportTrendPoint[],
    from: Date | null,
    to: Date | null,
  ): UsageReportTrendPoint[] {
    // Without explicit bounds, return observed dates only.
    if (!from || !to) {
      return rows.map((row) => ({
        ...row,
        ticketsCreated: Number(row.ticketsCreated),
        activitiesRecorded: Number(row.activitiesRecorded),
        commentsCreated: Number(row.commentsCreated),
        attachmentsUploaded: Number(row.attachmentsUploaded),
        approvalRequests: Number(row.approvalRequests),
      }));
    }

    const observed = new Map(rows.map((row) => [row.date, row]));

    const result: UsageReportTrendPoint[] = [];

    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);

    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);

    while (cursor <= end) {
      const date = cursor.toISOString().slice(0, 10);

      result.push(
        observed.get(date) ?? {
          date,
          ticketsCreated: 0,
          activitiesRecorded: 0,
          commentsCreated: 0,
          attachmentsUploaded: 0,
          approvalRequests: 0,
        },
      );

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
  }
}
