import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';

import type { OrganizationContext } from '../../common/organization/organization.types';

import { AnalyticsQueryService } from './analytics-query.service';

const context: OrganizationContext = {
  organizationId: 'org-analytics-test',
  userId: 'user-analytics-test',
  role: 'OWNER',
};

describe('AnalyticsQueryService', () => {
  const service = new AnalyticsQueryService();

  describe('normalize', () => {
    it('applies defaults and always derives organization scope from context', () => {
      const query = service.normalize(context);

      expect(query).toMatchObject({
        organizationId: context.organizationId,
        dateField: 'createdAt',
        dateRange: {
          from: null,
          to: null,
        },
        sortBy: 'createdAt',
        sortOrder: 'desc',
        page: 1,
        limit: 25,
      });
    });

    it('normalizes supplied dates and preserves the selected date field', () => {
      const query = service.normalize(context, {
        dateField: 'updatedAt',
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
      });

      expect(query.dateField).toBe('updatedAt');
      expect(query.dateRange.from).toEqual(
        new Date('2026-10-01T00:00:00.000Z'),
      );
      expect(query.dateRange.to).toEqual(new Date('2026-10-31T23:59:59.999Z'));
    });

    it('trims optional identifiers and ignores blank values', () => {
      const query = service.normalize(context, {
        teamId: ' team-1 ',
        productId: ' product-1 ',
        assigneeId: '   ',
        requesterId: ' requester-1 ',
      });

      expect(query.dimensions.teamId).toBe('team-1');
      expect(query.dimensions.productId).toBe('product-1');
      expect(query.dimensions.requesterId).toBe('requester-1');
      expect(query.dimensions.assigneeId).toBeUndefined();
    });

    it('rejects invalid date values', () => {
      expect(() =>
        service.normalize(context, {
          from: 'not-a-date',
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects an inverted date range', () => {
      expect(() =>
        service.normalize(context, {
          from: '2026-10-31T00:00:00.000Z',
          to: '2026-10-01T00:00:00.000Z',
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects conflicting assignee and unassigned filters', () => {
      expect(() =>
        service.normalize(context, {
          assigneeId: 'agent-1',
          unassigned: true,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects conflicting team and unassigned-team filters', () => {
      expect(() =>
        service.normalize(context, {
          teamId: 'team-1',
          unassignedTeam: true,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects unsupported sorting fields and directions', () => {
      expect(() =>
        service.normalize(context, {
          sortBy: 'title' as never,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.normalize(context, {
          sortOrder: 'sideways' as never,
        }),
      ).toThrow(BadRequestException);
    });

    it('rejects non-positive pagination values and limits above 100', () => {
      expect(() =>
        service.normalize(context, {
          page: 0,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.normalize(context, {
          limit: 0,
        }),
      ).toThrow(BadRequestException);

      expect(() =>
        service.normalize(context, {
          limit: 101,
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('pagination', () => {
    it('calculates offsets using normalized page and limit values', () => {
      const firstPage = service.normalize(context, {
        page: 1,
        limit: 10,
      });

      const thirdPage = service.normalize(context, {
        page: 3,
        limit: 10,
      });

      expect(service.offset(firstPage)).toBe(0);
      expect(service.offset(thirdPage)).toBe(20);
    });
  });

  describe('buildTicketWhere', () => {
    it('always includes the organization constraint', () => {
      const query = service.normalize(context, {
        status: 'OPEN',
      });

      const where = service.buildTicketWhere(query);

      expect(where.sql).toContain('"Ticket"."organizationId" =');
      expect(where.values).toContain(context.organizationId);
      expect(where.values).toContain('OPEN');
    });

    it('includes the selected date field and inclusive date bounds', () => {
      const from = new Date('2026-10-01T00:00:00.000Z');
      const to = new Date('2026-10-31T23:59:59.999Z');

      const query = service.normalize(context, {
        dateField: 'updatedAt',
        from,
        to,
      });

      const where = service.buildTicketWhere(query);

      expect(where.sql).toContain('"Ticket"."updatedAt"');
      expect(where.sql).toContain('>=');
      expect(where.sql).toContain('<=');

      expect(
        where.values.some(
          (value) =>
            value instanceof Date && value.getTime() === from.getTime(),
        ),
      ).toBe(true);

      expect(
        where.values.some(
          (value) => value instanceof Date && value.getTime() === to.getTime(),
        ),
      ).toBe(true);
    });

    it('includes ticket dimensions in the generated query', () => {
      const query = service.normalize(context, {
        status: 'OPEN',
        priority: 'HIGH',
        type: 'INCIDENT',
        teamId: 'team-1',
        productId: 'product-1',
        assigneeId: 'agent-1',
        requesterId: 'requester-1',
      });

      const where = service.buildTicketWhere(query);

      expect(where.sql).toContain('"Ticket"."status"');
      expect(where.sql).toContain('"Ticket"."priority"');
      expect(where.sql).toContain('"Ticket"."type"');
      expect(where.sql).toContain('"Ticket"."teamId"');
      expect(where.sql).toContain('"Ticket"."productId"');
      expect(where.sql).toContain('"Ticket"."assigneeId"');
      expect(where.sql).toContain('"Ticket"."requesterId"');

      for (const value of [
        context.organizationId,
        'OPEN',
        'HIGH',
        'INCIDENT',
        'team-1',
        'product-1',
        'agent-1',
        'requester-1',
      ]) {
        expect(where.values).toContain(value);
      }
    });

    it('represents unassigned filters with SQL null checks', () => {
      const query = service.normalize(context, {
        unassigned: true,
        unassignedTeam: true,
      });

      const where = service.buildTicketWhere(query);

      expect(where.sql).toContain('"Ticket"."assigneeId" IS NULL');
      expect(where.sql).toContain('"Ticket"."teamId" IS NULL');
    });

    it('generates deterministic sort fields and directions', () => {
      const ascending = service.normalize(context, {
        sortBy: 'updatedAt',
        sortOrder: 'asc',
      });

      const descending = service.normalize(context, {
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });

      const ascendingSql = service.buildTicketOrderBy(ascending);
      const descendingSql = service.buildTicketOrderBy(descending);

      expect(ascendingSql.sql).toContain('"Ticket"."updatedAt"');
      expect(ascendingSql.sql).toContain('ASC');

      expect(descendingSql.sql).toContain('"Ticket"."createdAt"');
      expect(descendingSql.sql).toContain('DESC');
    });
  });
});
