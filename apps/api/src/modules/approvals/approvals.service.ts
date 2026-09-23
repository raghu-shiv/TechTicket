import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EventEmitter2 } from '@nestjs/event-emitter';

import { APPROVAL_EVENTS } from './approval-events';

import { TicketApprovalStatus, type TicketApproval } from '@prisma/client';

import { DatabaseService } from '../../database/database.service';

import type { OrganizationContext } from '../../common/organization/organization.types';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly database: DatabaseService,

    private readonly eventEmitter: EventEmitter2,
  ) {}

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

        ticketNumber: true,

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
        role: true,
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

    if (approverMembership.role === 'REQUESTER') {
      throw new BadRequestException(
        'A REQUESTER cannot be assigned as an approver',
      );
    }

    const normalizedComment = comment?.trim() || null;

    const approval = await this.database.ticketApproval.create({
      data: {
        ticketId: ticket.id,

        approverId,

        status: TicketApprovalStatus.PENDING,

        comment: normalizedComment,
      },
    });

    this.eventEmitter.emit(APPROVAL_EVENTS.REQUESTED, {
      approvalId: approval.id,

      ticketId: ticket.id,

      ticketNumber: ticket.ticketNumber,

      organizationId: context.organizationId,

      actorId: context.userId,

      requesterId: ticket.requesterId,

      approverId: approval.approverId,

      status: approval.status,

      comment: approval.comment,

      occurredAt: approval.requestedAt,
    });

    return approval;
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
  ): Promise<
    TicketApproval & { ticket: { requesterId: string; ticketNumber: string } }
  > {
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

            ticketNumber: true,
          },
        },
      },
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    return approval;
  }

  async findPendingForTicket(
    context: OrganizationContext,

    ticketId: string,
  ): Promise<TicketApproval | null> {
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

    return this.database.ticketApproval.findFirst({
      where: {
        ticketId: ticket.id,

        status: TicketApprovalStatus.PENDING,
      },

      orderBy: {
        requestedAt: 'desc',
      },
    });
  }

  async hasPendingApproval(
    context: OrganizationContext,

    ticketId: string,
  ): Promise<boolean> {
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

    const approval = await this.database.ticketApproval.findFirst({
      where: {
        ticketId: ticket.id,

        status: TicketApprovalStatus.PENDING,
      },

      select: {
        id: true,
      },
    });

    return Boolean(approval);
  }

  async approve(
    context: OrganizationContext,

    ticketId: string,

    approvalId: string,

    comment?: string,
  ): Promise<TicketApproval> {
    const approval = await this.findOne(context, approvalId);

    if (approval.ticketId !== ticketId) {
      throw new NotFoundException('Approval not found');
    }

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

    const updatedApproval = await this.database.ticketApproval.update({
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

    this.eventEmitter.emit(APPROVAL_EVENTS.APPROVED, {
      approvalId: updatedApproval.id,

      ticketId: approval.ticketId,

      ticketNumber: approval.ticket.ticketNumber,

      organizationId: context.organizationId,

      actorId: context.userId,

      requesterId: approval.ticket.requesterId,

      approverId: updatedApproval.approverId,

      status: updatedApproval.status,

      comment: updatedApproval.comment,

      occurredAt: updatedApproval.approvedAt ?? updatedApproval.updatedAt,
    });

    return updatedApproval;
  }

  async reject(
    context: OrganizationContext,

    ticketId: string,

    approvalId: string,

    comment?: string,
  ): Promise<TicketApproval> {
    const approval = await this.findOne(context, approvalId);

    if (approval.ticketId !== ticketId) {
      throw new NotFoundException('Approval not found');
    }

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

    const updatedApproval = await this.database.ticketApproval.update({
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

    this.eventEmitter.emit(APPROVAL_EVENTS.REJECTED, {
      approvalId: updatedApproval.id,

      ticketId: approval.ticketId,

      ticketNumber: approval.ticket.ticketNumber,

      organizationId: context.organizationId,

      actorId: context.userId,

      requesterId: approval.ticket.requesterId,

      approverId: updatedApproval.approverId,

      status: updatedApproval.status,

      comment: updatedApproval.comment,

      occurredAt: updatedApproval.rejectedAt ?? updatedApproval.updatedAt,
    });

    return updatedApproval;
  }

  async cancel(
    context: OrganizationContext,

    ticketId: string,

    approvalId: string,
  ): Promise<TicketApproval> {
    const approval = await this.findOne(context, approvalId);

    if (approval.ticketId !== ticketId) {
      throw new NotFoundException('Approval not found');
    }

    this.assertTransition(approval.status, TicketApprovalStatus.CANCELLED);

    const updatedApproval = await this.database.ticketApproval.update({
      where: {
        id: approval.id,
      },

      data: {
        status: TicketApprovalStatus.CANCELLED,
      },
    });

    this.eventEmitter.emit(APPROVAL_EVENTS.CANCELLED, {
      approvalId: updatedApproval.id,

      ticketId: approval.ticketId,

      ticketNumber: approval.ticket.ticketNumber,

      organizationId: context.organizationId,

      actorId: context.userId,

      requesterId: approval.ticket.requesterId,

      approverId: updatedApproval.approverId,

      status: updatedApproval.status,

      comment: updatedApproval.comment,

      occurredAt: updatedApproval.updatedAt,
    });

    return updatedApproval;
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
