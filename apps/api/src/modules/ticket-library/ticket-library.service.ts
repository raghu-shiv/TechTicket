import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TicketStatus } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

interface ListTicketLibraryFilters {
  page?: number;
  limit?: number;
  search?: string;
  productId?: string;
}

interface CreateTicketLibraryInput {
  title: string;
  problem: string;
  resolution: string;
  productId?: string;
  sourceTicketId?: string;
  tags?: string[];
}

interface UpdateTicketLibraryInput {
  title?: string;
  problem?: string;
  resolution?: string;
  productId?: string;
  tags?: string[];
}

const entryInclude = {
  product: {
    select: { id: true, name: true, isActive: true },
  },
  sourceTicket: {
    select: { id: true, ticketNumber: true, title: true, status: true },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.TicketLibraryEntryInclude;

@Injectable()
export class TicketLibraryService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(context: OrganizationContext, filters: ListTicketLibraryFilters = {}) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const search = filters.search?.trim();

    const where: Prisma.TicketLibraryEntryWhereInput = {
      organizationId: context.organizationId,
      ...(filters.productId ? { productId: filters.productId } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { problem: { contains: search, mode: 'insensitive' } },
              { resolution: { contains: search, mode: 'insensitive' } },
              { tags: { has: search } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.database.ticketLibraryEntry.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }, { title: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
        include: entryInclude,
      }),
      this.database.ticketLibraryEntry.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(context: OrganizationContext, entryId: string) {
    const entry = await this.database.ticketLibraryEntry.findFirst({
      where: { id: entryId, organizationId: context.organizationId },
      include: entryInclude,
    });
    if (!entry) throw new NotFoundException('Knowledge article not found');
    return entry;
  }

  async create(context: OrganizationContext, input: CreateTicketLibraryInput) {
    const title = input.title.trim();
    const problem = input.problem.trim();
    const resolution = input.resolution.trim();
    if (!title || !problem || !resolution) {
      throw new BadRequestException('Title, problem, and resolution are required');
    }

    if (input.productId) {
      await this.assertProductInOrganization(context.organizationId, input.productId);
    }

    if (input.sourceTicketId) {
      await this.assertEligibleSourceTicket(context.organizationId, input.sourceTicketId);
    }

    return this.database.ticketLibraryEntry.create({
      data: {
        organizationId: context.organizationId,
        createdById: context.userId,
        title,
        problem,
        resolution,
        productId: input.productId || null,
        sourceTicketId: input.sourceTicketId || null,
        tags: this.normalizeTags(input.tags),
      },
      include: entryInclude,
    });
  }

  async update(
    context: OrganizationContext,
    entryId: string,
    input: UpdateTicketLibraryInput,
  ) {
    await this.findOne(context, entryId);

    if (
      input.title === undefined &&
      input.problem === undefined &&
      input.resolution === undefined &&
      input.productId === undefined &&
      input.tags === undefined
    ) {
      throw new BadRequestException('At least one field must be provided');
    }

    const title = input.title === undefined ? undefined : input.title.trim();
    const problem = input.problem === undefined ? undefined : input.problem.trim();
    const resolution = input.resolution === undefined ? undefined : input.resolution.trim();

    if (title !== undefined && !title) throw new BadRequestException('Title is required');
    if (problem !== undefined && !problem) throw new BadRequestException('Problem is required');
    if (resolution !== undefined && !resolution) throw new BadRequestException('Resolution is required');

    if (input.productId) {
      await this.assertProductInOrganization(context.organizationId, input.productId);
    }

    return this.database.ticketLibraryEntry.update({
      where: { id: entryId },
      data: {
        ...(title !== undefined ? { title } : {}),
        ...(problem !== undefined ? { problem } : {}),
        ...(resolution !== undefined ? { resolution } : {}),
        ...(input.productId !== undefined ? { productId: input.productId || null } : {}),
        ...(input.tags !== undefined ? { tags: this.normalizeTags(input.tags) } : {}),
      },
      include: entryInclude,
    });
  }

  async remove(context: OrganizationContext, entryId: string) {
    await this.findOne(context, entryId);
    await this.database.ticketLibraryEntry.delete({ where: { id: entryId } });
    return { id: entryId, deleted: true as const };
  }

  private async assertProductInOrganization(organizationId: string, productId: string) {
    const product = await this.database.product.findFirst({
      where: { id: productId, organizationId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found in this organization');
  }

  private async assertEligibleSourceTicket(organizationId: string, ticketId: string) {
    const ticket = await this.database.ticket.findFirst({
      where: { id: ticketId, organizationId },
      select: { id: true, status: true },
    });
    if (!ticket) throw new NotFoundException('Source ticket not found');
    if (ticket.status !== TicketStatus.RESOLVED && ticket.status !== TicketStatus.CLOSED) {
      throw new BadRequestException('Only resolved or closed tickets can be linked as knowledge sources');
    }
  }

  private normalizeTags(tags?: string[]): string[] {
    const normalized = (tags ?? [])
      .map((tag) => tag.trim())
      .filter(Boolean)
      .map((tag) => tag.slice(0, 50));
    return [...new Map(normalized.map((tag) => [tag.toLocaleLowerCase(), tag])).values()].slice(0, 30);
  }
}
