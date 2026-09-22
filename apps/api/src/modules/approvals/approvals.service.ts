import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { TicketApprovalStatus, type TicketApproval } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

@Injectable()
export class ApprovalsService {
  constructor(private readonly database: DatabaseService) {}

  async requestApproval(
    context: OrganizationContext,
    ticketId: string,
    approverId: string,
    comment?: string,
  ): Promise<TicketApproval> {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
        requesterId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const approverMembership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: approverId,
          organizationId: context.organizationId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!approverMembership) {
      throw new BadRequestException(
        'Approver does not belong to this organization',
      );
    }

    if (approverId === context.userId) {
      throw new BadRequestException(
        'You cannot request approval from yourself',
      );
    }

    const normalizedComment = comment?.trim() || null;

    return this.database.ticketApproval.create({
      data: {
        ticketId: ticket.id,
        approverId,
        status: TicketApprovalStatus.PENDING,
        comment: normalizedComment,
      },
    });
  }

  async findForTicket(
    context: OrganizationContext,
    ticketId: string,
  ): Promise<TicketApproval[]> {
    const ticket = await this.database.ticket.findFirst({
      where: {
        id: ticketId,
        organizationId: context.organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return this.database.ticketApproval.findMany({
      where: {
        ticketId: ticket.id,
        ticket: {
          organizationId: context.organizationId,
        },
      },
      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async findOne(
    context: OrganizationContext,
    approvalId: string,
  ): Promise<TicketApproval & { ticket: { requesterId: string } }> {
    const approval = await this.database.ticketApproval.findFirst({
      where: {
        id: approvalId,
        ticket: {
          organizationId: context.organizationId,
        },
      },
      include: {
        ticket: {
          select: {
            requesterId: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    return approval;
  }

  async approve(
    context: OrganizationContext,
    approvalId: string,
    comment?: string,
  ): Promise<TicketApproval> {
    const approval = await this.findOne(context, approvalId);

    this.assertTransition(approval.status, TicketApprovalStatus.APPROVED);

    if (approval.approverId !== context.userId) {
      throw new ForbiddenException(
        'You are not authorized to approve this request',
      );
    }

    if (approval.ticket.requesterId === context.userId) {
      throw new ForbiddenException('You cannot approve your own ticket');
    }

    const normalizedComment = comment?.trim();

    return this.database.ticketApproval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: TicketApprovalStatus.APPROVED,
        approvedAt: new Date(),
        ...(normalizedComment !== undefined && {
          comment: normalizedComment || null,
        }),
      },
    });
  }

  async reject(
    context: OrganizationContext,
    approvalId: string,
    comment?: string,
  ): Promise<TicketApproval> {
    const approval = await this.findOne(context, approvalId);

    this.assertTransition(approval.status, TicketApprovalStatus.REJECTED);

    if (approval.approverId !== context.userId) {
      throw new ForbiddenException(
        'You are not authorized to reject this request',
      );
    }

    if (approval.ticket.requesterId === context.userId) {
      throw new ForbiddenException('You cannot reject your own ticket');
    }

    const normalizedComment = comment?.trim();

    return this.database.ticketApproval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: TicketApprovalStatus.REJECTED,
        rejectedAt: new Date(),
        ...(normalizedComment !== undefined && {
          comment: normalizedComment || null,
        }),
      },
    });
  }

  async cancel(
    context: OrganizationContext,
    approvalId: string,
  ): Promise<TicketApproval> {
    const approval = await this.findOne(context, approvalId);

    this.assertTransition(approval.status, TicketApprovalStatus.CANCELLED);

    if (approval.approverId !== context.userId) {
      throw new ForbiddenException(
        'You are not authorized to cancel this request',
      );
    }

    return this.database.ticketApproval.update({
      where: {
        id: approval.id,
      },
      data: {
        status: TicketApprovalStatus.CANCELLED,
      },
    });
  }

  private assertTransition(
    currentStatus: TicketApprovalStatus,
    nextStatus: TicketApprovalStatus,
  ): void {
    const allowedTransitions: Record<
      TicketApprovalStatus,
      readonly TicketApprovalStatus[]
    > = {
      [TicketApprovalStatus.PENDING]: [
        TicketApprovalStatus.APPROVED,
        TicketApprovalStatus.REJECTED,
        TicketApprovalStatus.CANCELLED,
      ],
      [TicketApprovalStatus.APPROVED]: [],
      [TicketApprovalStatus.REJECTED]: [],
      [TicketApprovalStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[currentStatus].includes(nextStatus)) {
      throw new BadRequestException(
        `Approval cannot transition from ${currentStatus} to ${nextStatus}`,
      );
    }
  }
}
