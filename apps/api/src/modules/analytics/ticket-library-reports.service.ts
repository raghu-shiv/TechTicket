import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';
import {
  buildTicketLibraryWhere,
  type TicketLibraryFilters,
} from '../tickets/ticket-library-query';

import type { TicketLibraryReportQueryDto } from './dto/ticket-library-report-query.dto';

const BATCH_SIZE = 1000;

type ReportPoint = {
  key: string;
  label: string;
  count: number;
  id: string | null;
};

@Injectable()
export class TicketLibraryReportsService {
  constructor(private readonly database: DatabaseService) {}

  async getReport(
    context: OrganizationContext,
    query: TicketLibraryReportQueryDto,
  ) {
    const dateField = query.dateField ?? 'createdAt';

    // `page` and `limit` are irrelevant to aggregate counts.
    const filters: TicketLibraryFilters = {
      search: query.search,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      updatedFrom: query.updatedFrom,
      updatedTo: query.updatedTo,
      status: query.status,
      priority: query.priority,
      type: query.type,
      productId: query.productId,
      assigneeId: query.assigneeId,
      teamId: query.teamId,
      requesterId: query.requesterId,
      unassigned: query.unassigned,
      unassignedTeam: query.unassignedTeam,
      slaBreached: query.slaBreached,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    };

    const where = buildTicketLibraryWhere(context, filters);

    const statusWhere = buildTicketLibraryWhere(context, {
      ...filters,
      status: undefined,
    });

    const priorityWhere = buildTicketLibraryWhere(context, {
      ...filters,
      priority: undefined,
    });

    const teamWhere = buildTicketLibraryWhere(context, {
      ...filters,
      teamId: undefined,
      unassignedTeam: undefined,
    });

    const employeeWhere = buildTicketLibraryWhere(context, {
      ...filters,
      assigneeId: undefined,
      unassigned: undefined,
    });

    const assignmentWhere = buildTicketLibraryWhere(context, {
      ...filters,
      assigneeId: undefined,
      unassigned: undefined,
    });

    const [
      filteredCount,
      statusGroups,
      priorityGroups,
      teamGroups,
      employeeGroups,
      unassignedCount,
      savedFilterRows,
    ] = await Promise.all([
      // Exact combination of current report filters.
      this.database.ticket.count({ where }),

      // Status facet: remove only status.
      this.database.ticket.groupBy({
        by: ['status'],
        where: statusWhere,
        _count: { _all: true },
      }),

      // Priority facet: remove only priority.
      this.database.ticket.groupBy({
        by: ['priority'],
        where: priorityWhere,
        _count: { _all: true },
      }),

      // Team facet: remove team selection and the no-team toggle.
      this.database.ticket.groupBy({
        by: ['teamId'],
        where: teamWhere,
        _count: { _all: true },
      }),

      // Employee facet: remove assignee selection and unassigned toggle.
      this.database.ticket.groupBy({
        by: ['assigneeId'],
        where: employeeWhere,
        _count: { _all: true },
      }),

      // Unassigned count: ignore an existing assignee selection.
      this.database.ticket.count({
        where: {
          AND: [assignmentWhere, { assigneeId: null }],
        },
      }),

      this.database.savedFilter.findMany({
        where: {
          organizationId: context.organizationId,
          userId: context.userId,
        },
        select: {
          id: true,
          name: true,
          filters: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    const teamIds = teamGroups
      .map((row) => row.teamId)
      .filter((id): id is string => id !== null);

    const employeeIds = employeeGroups
      .map((row) => row.assigneeId)
      .filter((id): id is string => id !== null);

    const [teams, employees] = await Promise.all([
      teamIds.length
        ? this.database.team.findMany({
            where: {
              organizationId: context.organizationId,
              id: { in: teamIds },
            },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),

      employeeIds.length
        ? this.database.user.findMany({
            where: { id: { in: employeeIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    const teamNames = new Map(teams.map((item) => [item.id, item.name]));
    const employeeNames = new Map(
      employees.map((item) => [item.id, item.name]),
    );

    const byStatus: ReportPoint[] = statusGroups
      .map((row) => ({
        key: row.status,
        label: row.status.replaceAll('_', ' '),
        count: Number(row._count._all),
        id: row.status,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const priorityOrder = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

    const byPriority: ReportPoint[] = priorityGroups
      .map((row) => ({
        key: row.priority,
        label: row.priority,
        count: Number(row._count._all),
        id: row.priority,
      }))
      .sort(
        (a, b) => priorityOrder.indexOf(a.key) - priorityOrder.indexOf(b.key),
      );

    const byTeam: ReportPoint[] = teamGroups
      .map((row) => ({
        key: row.teamId ?? 'unassigned',
        label: row.teamId
          ? (teamNames.get(row.teamId) ?? 'Unknown team')
          : 'Unassigned team',
        count: Number(row._count._all),
        id: row.teamId,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const byEmployee: ReportPoint[] = employeeGroups
      .map((row) => ({
        key: row.assigneeId ?? 'unassigned',
        label: row.assigneeId
          ? (employeeNames.get(row.assigneeId) ?? 'Unknown employee')
          : 'Unassigned',
        count: Number(row._count._all),
        id: row.assigneeId,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    const byDate = await this.getDateBuckets(where, dateField);

    // Saved-filter counts are measured against each saved filter's own
    // definition, not against the currently selected report filters.
    const savedFilters = await Promise.all(
      savedFilterRows.map(async (savedFilter) => {
        const savedDefinition =
          savedFilter.filters as unknown as TicketLibraryFilters;

        const savedWhere: Prisma.TicketWhereInput = buildTicketLibraryWhere(
          context,
          savedDefinition,
        );

        const count = await this.database.ticket.count({
          where: savedWhere,
        });

        return {
          id: savedFilter.id,
          name: savedFilter.name,
          count,
          updatedAt: savedFilter.updatedAt.toISOString(),
          filters: savedFilter.filters,
        };
      }),
    );

    return {
      data: {
        filteredCount: Number(filteredCount),
        byStatus,
        byPriority,
        byTeam,
        byEmployee,
        byDate,
        unassignedCount: Number(unassignedCount),
        savedFilters,
      },
      meta: {
        organizationScoped: true as const,
        queryVersion: 1,
        dateField,
        filters: {
          search: query.search ?? null,
          status: query.status ?? null,
          priority: query.priority ?? null,
          type: query.type ?? null,
          productId: query.productId ?? null,
          teamId: query.teamId ?? null,
          assigneeId: query.assigneeId ?? null,
          requesterId: query.requesterId ?? null,
          unassigned: query.unassigned ?? null,
          unassignedTeam: query.unassignedTeam ?? null,
          slaBreached: query.slaBreached ?? null,
          createdFrom: query.createdFrom ?? null,
          createdTo: query.createdTo ?? null,
          updatedFrom: query.updatedFrom ?? null,
          updatedTo: query.updatedTo ?? null,
        },
      },
    };
  }

  private async getDateBuckets(
    where: Prisma.TicketWhereInput,
    dateField: 'createdAt' | 'updatedAt',
  ) {
    const counts = new Map<string, number>();
    let cursorId: string | undefined;

    // Process matching tickets in batches to avoid loading the whole cohort.
    while (true) {
      const rows = await this.database.ticket.findMany({
        where,
        orderBy: { id: 'asc' },
        ...(cursorId
          ? {
              cursor: { id: cursorId },
              skip: 1,
            }
          : {}),
        take: BATCH_SIZE,
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      for (const row of rows) {
        const value = dateField === 'updatedAt' ? row.updatedAt : row.createdAt;
        const day = value.toISOString().slice(0, 10);
        counts.set(day, (counts.get(day) ?? 0) + 1);
      }

      if (rows.length < BATCH_SIZE) break;

      cursorId = rows[rows.length - 1]?.id;
      if (!cursorId) break;
    }

    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }
}
