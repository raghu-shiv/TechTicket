import { BadRequestException } from '@nestjs/common';
import {
  Prisma,
  TicketPriority,
  TicketStatus,
  TicketType,
} from '@prisma/client';

import type { OrganizationContext } from '../../common/organization/organization.types';

export interface TicketLibraryFilters {
  page?: number;
  limit?: number;

  search?: string;

  createdFrom?: string;
  createdTo?: string;
  updatedFrom?: string;
  updatedTo?: string;

  sortBy?: string;
  sortOrder?: string;

  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;

  productId?: string;
  assigneeId?: string;
  teamId?: string;
  requesterId?: string;

  unassigned?: boolean;
  unassignedTeam?: boolean;
  slaBreached?: boolean;
}

function parseDate(
  value: string | undefined,
  field: string,
  isEndDate = false,
): Date | undefined {
  if (!value) return undefined;

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(
    dateOnly && isEndDate ? `${value}T23:59:59.999Z` : value,
  );

  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date value for ${field}`);
  }

  return parsed;
}

function buildSearch(search: string | undefined): Prisma.TicketWhereInput {
  const normalized = search?.trim();

  if (!normalized) return {};

  const searchTerms = normalized
    .split(/\s+/)
    .map((term) => term.replace(/[&|!<>():*]/g, ''))
    .filter(Boolean);

  return {
    OR: [
      {
        ticketNumber: {
          contains: normalized,
          mode: 'insensitive',
        },
      },
      ...(searchTerms.length > 0
        ? [
            {
              AND: searchTerms.map((term) => ({
                OR: [
                  { title: { search: term } },
                  { description: { search: term } },
                ],
              })),
            },
          ]
        : []),
    ],
  };
}

/**
 * One authoritative predicate for Ticket Library listing and analytics.
 * Organization scope is always supplied by the authenticated context.
 */
export function buildTicketLibraryWhere(
  context: OrganizationContext,
  filters: TicketLibraryFilters = {},
): Prisma.TicketWhereInput {
  if (filters.assigneeId !== undefined && filters.unassigned !== undefined) {
    throw new BadRequestException('assigneeId cannot be used with unassigned');
  }

  if (filters.teamId !== undefined && filters.unassignedTeam !== undefined) {
    throw new BadRequestException('teamId cannot be used with unassignedTeam');
  }

  const createdFrom = parseDate(filters.createdFrom, 'createdFrom');
  const createdTo = parseDate(filters.createdTo, 'createdTo', true);
  const updatedFrom = parseDate(filters.updatedFrom, 'updatedFrom');
  const updatedTo = parseDate(filters.updatedTo, 'updatedTo', true);

  if (createdFrom && createdTo && createdFrom > createdTo) {
    throw new BadRequestException('createdFrom cannot be later than createdTo');
  }

  if (updatedFrom && updatedTo && updatedFrom > updatedTo) {
    throw new BadRequestException('updatedFrom cannot be later than updatedTo');
  }

  return {
    organizationId: context.organizationId,

    ...buildSearch(filters.search),

    ...(filters.productId !== undefined && {
      productId: filters.productId,
    }),

    ...(createdFrom || createdTo
      ? {
          createdAt: {
            ...(createdFrom && { gte: createdFrom }),
            ...(createdTo && { lte: createdTo }),
          },
        }
      : {}),

    ...(updatedFrom || updatedTo
      ? {
          updatedAt: {
            ...(updatedFrom && { gte: updatedFrom }),
            ...(updatedTo && { lte: updatedTo }),
          },
        }
      : {}),

    ...(filters.status !== undefined && { status: filters.status }),
    ...(filters.priority !== undefined && { priority: filters.priority }),
    ...(filters.type !== undefined && { type: filters.type }),

    ...(filters.assigneeId !== undefined && {
      assigneeId: filters.assigneeId,
    }),

    ...(filters.teamId !== undefined && { teamId: filters.teamId }),
    ...(filters.requesterId !== undefined && {
      requesterId: filters.requesterId,
    }),

    ...(filters.unassigned !== undefined && {
      assigneeId: filters.unassigned ? null : { not: null },
    }),

    ...(filters.unassignedTeam !== undefined && {
      teamId: filters.unassignedTeam ? null : { not: null },
    }),

    ...(filters.slaBreached === true && {
      sla: {
        OR: [
          { firstResponseBreachedAt: { not: null } },
          { resolutionBreachedAt: { not: null } },
        ],
      },
    }),
  };
}
