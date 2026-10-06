import { BadRequestException, Injectable } from '@nestjs/common';

import { Prisma } from '@prisma/client';

import type { OrganizationContext } from '../../common/organization/organization.types';

import {
  ANALYTICS_SORT_FIELDS,
  type AnalyticsDateField,
  type AnalyticsDateRange,
  type AnalyticsDimensions,
  type AnalyticsQueryInput,
  type AnalyticsSortField,
  type AnalyticsSortOrder,
  type NormalizedAnalyticsQuery,
} from './analytics.types';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

@Injectable()
export class AnalyticsQueryService {
  normalize(
    context: OrganizationContext,
    input: AnalyticsQueryInput = {},
  ): NormalizedAnalyticsQuery {
    const dateField: AnalyticsDateField = input.dateField ?? 'createdAt';

    const dateRange = this.normalizeDateRange(input.from, input.to);

    const dimensions: AnalyticsDimensions = {
      status: input.status,
      priority: input.priority,
      type: input.type,

      teamId: this.normalizeOptionalString(input.teamId),
      assigneeId: this.normalizeOptionalString(input.assigneeId),
      requesterId: this.normalizeOptionalString(input.requesterId),

      unassigned: input.unassigned,
      unassignedTeam: input.unassignedTeam,
    };

    if (
      dimensions.assigneeId !== undefined &&
      dimensions.unassigned !== undefined
    ) {
      throw new BadRequestException(
        'assigneeId cannot be used with unassigned',
      );
    }

    if (
      dimensions.teamId !== undefined &&
      dimensions.unassignedTeam !== undefined
    ) {
      throw new BadRequestException(
        'teamId cannot be used with unassignedTeam',
      );
    }

    const sortBy = this.normalizeSortField(input.sortBy);

    const sortOrder = this.normalizeSortOrder(input.sortOrder);

    const page = this.normalizePositiveInteger(input.page, 1, 'page');

    const limit = this.normalizeLimit(input.limit);

    return {
      organizationId: context.organizationId,
      dateField,
      dateRange,
      dimensions,
      sortBy,
      sortOrder,
      page,
      limit,
    };
  }

  buildTicketWhere(query: NormalizedAnalyticsQuery): Prisma.Sql {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`
        "Ticket"."organizationId" = ${query.organizationId}
      `,
    ];

    if (query.dateRange.from) {
      conditions.push(
        Prisma.sql`
          ${this.ticketDateColumn(query.dateField)}
          >=
          ${query.dateRange.from}
        `,
      );
    }

    if (query.dateRange.to) {
      conditions.push(
        Prisma.sql`
          ${this.ticketDateColumn(query.dateField)}
          <=
          ${query.dateRange.to}
        `,
      );
    }

    const { dimensions } = query;

    if (dimensions.status) {
      conditions.push(
        Prisma.sql`
          "Ticket"."status"
          =
          ${dimensions.status}::"TicketStatus"
        `,
      );
    }

    if (dimensions.priority) {
      conditions.push(
        Prisma.sql`
          "Ticket"."priority"
          =
          ${dimensions.priority}::"TicketPriority"
        `,
      );
    }

    if (dimensions.type) {
      conditions.push(
        Prisma.sql`
          "Ticket"."type"
          =
          ${dimensions.type}::"TicketType"
        `,
      );
    }

    if (dimensions.teamId !== undefined) {
      conditions.push(
        Prisma.sql`
          "Ticket"."teamId" = ${dimensions.teamId}
        `,
      );
    }

    if (dimensions.assigneeId !== undefined) {
      conditions.push(
        Prisma.sql`
          "Ticket"."assigneeId" = ${dimensions.assigneeId}
        `,
      );
    }

    if (dimensions.requesterId !== undefined) {
      conditions.push(
        Prisma.sql`
          "Ticket"."requesterId" = ${dimensions.requesterId}
        `,
      );
    }

    if (dimensions.unassigned !== undefined) {
      conditions.push(
        dimensions.unassigned
          ? Prisma.sql`
              "Ticket"."assigneeId" IS NULL
            `
          : Prisma.sql`
              "Ticket"."assigneeId" IS NOT NULL
            `,
      );
    }

    if (dimensions.unassignedTeam !== undefined) {
      conditions.push(
        dimensions.unassignedTeam
          ? Prisma.sql`
              "Ticket"."teamId" IS NULL
            `
          : Prisma.sql`
              "Ticket"."teamId" IS NOT NULL
            `,
      );
    }

    return Prisma.join(conditions, ' AND ');
  }

  buildTicketOrderBy(query: NormalizedAnalyticsQuery): Prisma.Sql {
    const direction =
      query.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;

    if (query.sortBy === 'updatedAt') {
      return Prisma.sql`
        "Ticket"."updatedAt" ${direction}
      `;
    }

    return Prisma.sql`
      "Ticket"."createdAt" ${direction}
    `;
  }

  offset(query: NormalizedAnalyticsQuery): number {
    return (query.page - 1) * query.limit;
  }

  private normalizeDateRange(
    from: string | Date | undefined,
    to: string | Date | undefined,
  ): AnalyticsDateRange {
    const normalizedFrom = this.parseDate(from, 'from');
    const normalizedTo = this.parseDate(to, 'to');

    if (normalizedFrom && normalizedTo && normalizedFrom > normalizedTo) {
      throw new BadRequestException('from cannot be later than to');
    }

    return {
      from: normalizedFrom,
      to: normalizedTo,
    };
  }

  private parseDate(
    value: string | Date | undefined,
    field: string,
  ): Date | null {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed =
      value instanceof Date ? new Date(value.getTime()) : new Date(value);

    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException(`Invalid date value for ${field}`);
    }

    return parsed;
  }

  private normalizeOptionalString(
    value: string | undefined,
  ): string | undefined {
    const normalized = value?.trim();

    return normalized || undefined;
  }

  private normalizeSortField(
    value: AnalyticsSortField | undefined,
  ): AnalyticsSortField {
    const sortBy = value ?? 'createdAt';

    if (!(ANALYTICS_SORT_FIELDS as readonly string[]).includes(sortBy)) {
      throw new BadRequestException(
        `Unsupported sort field: ${String(sortBy)}`,
      );
    }

    return sortBy;
  }

  private normalizeSortOrder(
    value: AnalyticsSortOrder | undefined,
  ): AnalyticsSortOrder {
    if (value === undefined) {
      return 'desc';
    }

    if (value !== 'asc' && value !== 'desc') {
      throw new BadRequestException(`Unsupported sort order: ${String(value)}`);
    }

    return value;
  }

  private normalizePositiveInteger(
    value: number | undefined,
    fallback: number,
    field: string,
  ): number {
    const normalized = value ?? fallback;

    if (!Number.isInteger(normalized) || normalized < 1) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return normalized;
  }

  private normalizeLimit(value: number | undefined): number {
    const limit = this.normalizePositiveInteger(value, DEFAULT_LIMIT, 'limit');

    if (limit > MAX_LIMIT) {
      throw new BadRequestException(`limit cannot exceed ${MAX_LIMIT}`);
    }

    return limit;
  }

  private ticketDateColumn(dateField: AnalyticsDateField): Prisma.Sql {
    switch (dateField) {
      case 'updatedAt':
        return Prisma.sql`
          "Ticket"."updatedAt"
        `;

      case 'createdAt':
      default:
        return Prisma.sql`
          "Ticket"."createdAt"
        `;
    }
  }
}
