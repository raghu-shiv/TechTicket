import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Prisma } from '@prisma/client';

import type { OrganizationContext } from '../../common/organization/organization.types';
import { DatabaseService } from '../../database/database.service';

import type { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import {
  NOTIFICATION_EVENTS,
  type NotificationCreatedEvent,
  type NotificationType,
  type NotificationUpdatedEvent,
} from './notification-events';

export interface CreateNotificationInput {
  organizationId: string;
  recipientId: string;
  actorId: string | null;
  ticketId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  occurredAt?: Date;
}

const notificationListSelect = {
  id: true,
  type: true,
  title: true,
  message: true,
  ticketId: true,
  createdAt: true,
  readAt: true,
  ticket: {
    select: {
      id: true,
      ticketNumber: true,
      title: true,
    },
  },
} satisfies Prisma.NotificationSelect;

@Injectable()
export class NotificationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a durable notification for a recipient who still belongs
   * to the event's organization.
   *
   * A ticket reference is accepted only if the ticket belongs to that
   * same organization. The created event is emitted only after persistence.
   */
  async createNotification(
    input: CreateNotificationInput,
  ): Promise<NotificationCreatedEvent | null> {
    const title = input.title.trim();
    const message = input.message.trim();

    if (!title || !message) {
      throw new BadRequestException(
        'Notification title and message are required.',
      );
    }

    const recipientMembership = await this.database.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: input.recipientId,
          organizationId: input.organizationId,
        },
      },
      select: {
        userId: true,
      },
    });

    // An event may be processed after a recipient has left the organization.
    // Do not create a notification for a non-member.
    if (!recipientMembership) {
      return null;
    }

    let ticketId: string | null = input.ticketId ?? null;

    if (ticketId) {
      const ticket = await this.database.ticket.findFirst({
        where: {
          id: ticketId,
          organizationId: input.organizationId,
        },
        select: {
          id: true,
        },
      });

      // Never create a cross-organization ticket reference.
      if (!ticket) {
        return null;
      }

      ticketId = ticket.id;
    }

    let actorId: string | null = null;

    if (input.actorId) {
      const actorMembership = await this.database.membership.findUnique({
        where: {
          userId_organizationId: {
            userId: input.actorId,
            organizationId: input.organizationId,
          },
        },
        select: {
          userId: true,
        },
      });

      // Actor is optional in the persistent record because a membership
      // can change between an event being generated and processed.
      actorId = actorMembership?.userId ?? null;
    }

    const notification = await this.database.notification.create({
      data: {
        organizationId: input.organizationId,
        recipientId: input.recipientId,
        actorId,
        ticketId,
        type: input.type,
        title,
        message,
        ...(input.occurredAt ? { createdAt: input.occurredAt } : {}),
      },
      select: {
        id: true,
        organizationId: true,
        recipientId: true,
        actorId: true,
        ticketId: true,
        type: true,
        title: true,
        message: true,
        createdAt: true,
        readAt: true,
      },
    });

    const event: NotificationCreatedEvent = {
      notificationId: notification.id,
      organizationId: notification.organizationId,
      recipientId: notification.recipientId,
      actorId: notification.actorId,
      ticketId: notification.ticketId,
      type: notification.type as NotificationType,
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      readAt: null,
    };

    this.eventEmitter.emit(NOTIFICATION_EVENTS.CREATED, event);

    return event;
  }

  /**
   * Lists notifications for the authenticated user in the active
   * organization. The recipient and organization cannot be supplied
   * through the query string.
   */
  async listForUser(
    context: OrganizationContext,
    query: ListNotificationsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const where: Prisma.NotificationWhereInput = {
      organizationId: context.organizationId,
      recipientId: context.userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [data, total, unreadCount] = await Promise.all([
      this.database.notification.findMany({
        where,
        select: notificationListSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),

      this.database.notification.count({ where }),

      // This count includes all unread notifications for this recipient
      // in this organization, not just those on the current page.
      this.database.notification.count({
        where: {
          organizationId: context.organizationId,
          recipientId: context.userId,
          readAt: null,
        },
      }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        unreadCount,
      },
    };
  }

  /**
   * Marks a notification as read. The scoped update and lookup ensure
   * that another recipient cannot read or modify its state.
   *
   * Repeated requests are idempotent.
   */
  async markAsRead(context: OrganizationContext, notificationId: string) {
    const scope = {
      id: notificationId,
      organizationId: context.organizationId,
      recipientId: context.userId,
    };

    const existing = await this.database.notification.findFirst({
      where: scope,
      select: {
        id: true,
        readAt: true,
      },
    });

    // Return 404 for both nonexistent records and records owned by
    // another user or organization. This avoids disclosing their existence.
    if (!existing) {
      throw new NotFoundException('Notification not found.');
    }

    if (!existing.readAt) {
      const readAt = new Date();

      const updated = await this.database.notification.updateMany({
        where: {
          ...scope,
          readAt: null,
        },
        data: {
          readAt,
        },
      });

      if (updated.count > 0) {
        const event: NotificationUpdatedEvent = {
          notificationId,
          organizationId: context.organizationId,
          recipientId: context.userId,
          readAt,
        };

        this.eventEmitter.emit(NOTIFICATION_EVENTS.UPDATED, event);
      }
    }

    const notification = await this.database.notification.findFirst({
      where: scope,
      select: notificationListSelect,
    });

    if (!notification) {
      throw new NotFoundException('Notification not found.');
    }

    return notification;
  }
}
