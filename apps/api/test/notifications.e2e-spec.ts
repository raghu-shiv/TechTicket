import type { INestApplication } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import {
  cleanupApprovalTestData,
  createTestTicket,
} from './helpers/approval.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

import { DatabaseService } from '../src/database/database.service.js';
import { NotificationService } from '../src/modules/notifications/notification.service.js';
import { TICKET_EVENTS } from '../src/modules/tickets/ticket-events.js';

describe('Notification Center API (e2e)', () => {
  let app: INestApplication;
  let database: DatabaseService;
  let notificationService: NotificationService;
  let eventEmitter: EventEmitter2;

  let organizationA: OrganizationTestFixture;
  let organizationB: OrganizationTestFixture;

  beforeAll(async () => {
    app = await createTestApp();

    database = app.get(DatabaseService);
    notificationService = app.get(NotificationService);
    eventEmitter = app.get(EventEmitter2);

    organizationA = await createOrganizationTestFixture(app);
    organizationB = await createOrganizationTestFixture(app);

    // The same user can belong to more than one organization.
    // Their notification history must still remain organization-scoped.
    await database.membership.create({
      data: {
        userId: organizationA.requester.userId,
        organizationId: organizationB.organization.id,
        role: 'REQUESTER',
      },
    });
  });

  afterAll(async () => {
    if (organizationA) {
      await cleanupApprovalTestData(app, organizationA);
    }

    if (organizationB) {
      await cleanupApprovalTestData(app, organizationB);
    }

    await app.close();
  });

  it('lists only the authenticated recipient notifications in the active organization', async () => {
    const ticket = await createTestTicket(organizationA, organizationA.owner);

    const created = await notificationService.createNotification({
      organizationId: organizationA.organization.id,
      recipientId: organizationA.requester.userId,
      actorId: organizationA.owner.userId,
      ticketId: ticket.id,
      type: 'TICKET_STATUS_CHANGED',
      title: 'Ticket status changed',
      message: 'Ticket status changed from OPEN to IN_PROGRESS.',
    });

    expect(created).not.toBeNull();

    const response = await organizationA.requester.agent
      .get('/api/v1/notifications')
      .set('x-organization-id', organizationA.organization.id)
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(response.body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      unreadCount: 1,
    });

    expect(response.body.data).toHaveLength(1);

    expect(response.body.data[0]).toMatchObject({
      id: created!.notificationId,
      type: 'TICKET_STATUS_CHANGED',
      title: 'Ticket status changed',
      message: 'Ticket status changed from OPEN to IN_PROGRESS.',
      readAt: null,
      ticketId: ticket.id,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        title: ticket.title,
      },
    });

    // A different user in the same organization has no access to the
    // requester's notification.
    const otherRecipientResponse = await organizationA.agent.agent
      .get('/api/v1/notifications')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(otherRecipientResponse.body.data).toEqual([]);
    expect(otherRecipientResponse.body.meta.unreadCount).toBe(0);

    // The same user, even as a member of another organization, must not
    // see notifications associated with organization A.
    const otherOrganizationResponse = await organizationA.requester.agent
      .get('/api/v1/notifications')
      .set('x-organization-id', organizationB.organization.id)
      .expect(200);

    expect(otherOrganizationResponse.body.data).toEqual([]);
    expect(otherOrganizationResponse.body.meta.unreadCount).toBe(0);
  });

  it('marks only the authenticated recipient notification as read', async () => {
    const created = await notificationService.createNotification({
      organizationId: organizationA.organization.id,
      recipientId: organizationA.requester.userId,
      actorId: organizationA.owner.userId,
      type: 'APPROVAL_REQUESTED',
      title: 'Approval requested',
      message: 'An approval has been requested.',
    });

    expect(created).not.toBeNull();

    const path = `/api/v1/notifications/${created!.notificationId}/read`;

    const markedRead = await organizationA.requester.agent
      .patch(path)
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(markedRead.body.id).toBe(created!.notificationId);
    expect(markedRead.body.readAt).toBeTruthy();

    // Mark-read is idempotent.
    const markedReadAgain = await organizationA.requester.agent
      .patch(path)
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(markedReadAgain.body.readAt).toBe(markedRead.body.readAt);

    const list = await organizationA.requester.agent
      .get('/api/v1/notifications')
      .set('x-organization-id', organizationA.organization.id)
      .expect(200);

    expect(list.body.meta.unreadCount).toBe(1);
    expect(
      list.body.data.find(
        (item: { id: string }) => item.id === created!.notificationId,
      )?.readAt,
    ).toBeTruthy();

    // Another recipient cannot change this notification's read state.
    await organizationA.agent.agent
      .patch(path)
      .set('x-organization-id', organizationA.organization.id)
      .expect(404);

    // The same recipient in a different organization cannot use that
    // organization's context to modify the original notification.
    await organizationA.requester.agent
      .patch(path)
      .set('x-organization-id', organizationB.organization.id)
      .expect(404);
  });

  it('rejects invalid pagination and unread-only query values', async () => {
    const request = organizationA.owner.agent;

    await request
      .get('/api/v1/notifications')
      .set('x-organization-id', organizationA.organization.id)
      .query({ page: 0 })
      .expect(400);

    await request
      .get('/api/v1/notifications')
      .set('x-organization-id', organizationA.organization.id)
      .query({ limit: 51 })
      .expect(400);

    await request
      .get('/api/v1/notifications')
      .set('x-organization-id', organizationA.organization.id)
      .query({ unreadOnly: 'not-a-boolean' })
      .expect(400);
  });

  it('persists notifications emitted by recipient-targeted ticket events', async () => {
    const ticket = await createTestTicket(organizationA, organizationA.owner);

    const occurredAt = new Date();

    await eventEmitter.emitAsync(TICKET_EVENTS.STATUS_CHANGED, {
      ticketId: ticket.id,
      organizationId: organizationA.organization.id,
      actorId: organizationA.owner.userId,
      recipientIds: [organizationA.requester.userId],
      fromStatus: 'OPEN',
      toStatus: 'IN_PROGRESS',
      occurredAt,
    });

    const stored = await database.notification.findFirst({
      where: {
        organizationId: organizationA.organization.id,
        recipientId: organizationA.requester.userId,
        ticketId: ticket.id,
        type: 'TICKET_STATUS_CHANGED',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    expect(stored).not.toBeNull();

    expect(stored).toMatchObject({
      organizationId: organizationA.organization.id,
      recipientId: organizationA.requester.userId,
      ticketId: ticket.id,
      type: 'TICKET_STATUS_CHANGED',
      title: 'Ticket status changed',
      message: 'Ticket status changed from OPEN to IN_PROGRESS.',
    });
  });
});
