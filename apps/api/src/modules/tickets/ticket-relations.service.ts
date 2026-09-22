import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateTicketRelationDto } from './dto/create-ticket-relation.dto';

@Injectable()
export class TicketRelationsService {
  constructor(private readonly database: DatabaseService) {}

  async findAll(ticketId: string, organizationId: string) {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const [outgoing, incoming] = await Promise.all([
      this.database.ticketRelation.findMany({
        where: {
          fromTicketId: ticketId,
          fromTicket: {
            organizationId,
          },
        },
        include: {
          toTicket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.database.ticketRelation.findMany({
        where: {
          toTicketId: ticketId,
          toTicket: {
            organizationId,
          },
        },
        include: {
          fromTicket: {
            select: {
              id: true,
              ticketNumber: true,
              title: true,
              status: true,
              priority: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return [
      ...outgoing.map((relation) => ({
        id: relation.id,
        type: relation.type,
        direction: 'OUTGOING' as const,
        ticket: relation.toTicket,
        createdAt: relation.createdAt,
      })),

      ...incoming.map((relation) => ({
        id: relation.id,
        type: relation.type,
        direction: 'INCOMING' as const,
        ticket: relation.fromTicket,
        createdAt: relation.createdAt,
      })),
    ];
  }

  async create(
    ticketId: string,
    organizationId: string,
    dto: CreateTicketRelationDto,
  ) {
    const [ticket, relatedTicket] = await Promise.all([
      this.database.ticket.findFirst({
        where: {
          id: ticketId,
          organizationId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      }),

      this.database.ticket.findFirst({
        where: {
          id: dto.relatedTicketId,
        },
        select: {
          id: true,
          organizationId: true,
        },
      }),
    ]);

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (!relatedTicket) {
      throw new NotFoundException('Related ticket not found');
    }

    if (ticket.id === relatedTicket.id) {
      throw new BadRequestException('A ticket cannot be related to itself');
    }

    if (relatedTicket.organizationId !== organizationId) {
      throw new ForbiddenException(
        'Related ticket does not belong to the organization',
      );
    }

    const existing = await this.database.ticketRelation.findFirst({
      where: {
        fromTicketId: ticketId,
        toTicketId: dto.relatedTicketId,
        type: dto.type,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      throw new ConflictException('This ticket relationship already exists');
    }

    const inverse = await this.database.ticketRelation.findFirst({
      where: {
        fromTicketId: dto.relatedTicketId,
        toTicketId: ticketId,
        type: dto.type,
      },
      select: {
        id: true,
      },
    });

    if (inverse) {
      throw new ConflictException('This ticket relationship already exists');
    }

    const relation = await this.database.ticketRelation.create({
      data: {
        fromTicketId: ticketId,
        toTicketId: dto.relatedTicketId,
        type: dto.type,
      },
      include: {
        toTicket: {
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            status: true,
            priority: true,
          },
        },
      },
    });

    return {
      id: relation.id,
      type: relation.type,
      direction: 'OUTGOING' as const,
      ticket: relation.toTicket,
      createdAt: relation.createdAt,
    };
  }

  async remove(ticketId: string, relationId: string, organizationId: string) {
    const relation = await this.database.ticketRelation.findFirst({
      where: {
        id: relationId,
        fromTicketId: ticketId,
        fromTicket: {
          organizationId,
        },
        toTicket: {
          organizationId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!relation) {
      throw new NotFoundException('Ticket relationship not found');
    }

    await this.database.ticketRelation.delete({
      where: {
        id: relation.id,
      },
    });

    return {
      message: 'Ticket relationship removed successfully',
    };
  }
}
