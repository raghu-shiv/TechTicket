import type { INestApplication } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestApp } from './helpers/app.helper.js';
import {
  createPendingApproval,
  createTestTicket,
  cleanupApprovalTestData,
} from './helpers/approval.helper.js';
import {
  getNotificationQueue,
  waitForEmailNotificationJob,
} from './helpers/notification.helper.js';
import {
  createOrganizationTestFixture,
  type OrganizationTestFixture,
} from './helpers/organization.helper.js';

import type { SendEmailNotificationJob } from '../src/modules/notifications/queues/notification-job.types.js';
import { NOTIFICATION_JOBS } from '../src/modules/notifications/queues/notification-queue.constants.js';

describe('Notification Integration (e2e)', () => {
  let app: INestApplication;
  let fixture: OrganizationTestFixture;
  let notificationQueue: Queue<SendEmailNotificationJob>;

  beforeAll(async () => {
    app = await createTestApp();

    fixture = await createOrganizationTestFixture(app);

    notificationQueue = getNotificationQueue(app);
  });

  afterAll(async () => {
    if (fixture) {
      await cleanupApprovalTestData(app, fixture);
    }

    await app.close();
  });

  describe('Approval requested notification', () => {
    it('should enqueue an email notification for the assigned approver', async () => {
      const ticket = await createTestTicket(fixture, fixture.owner);

      const response = await fixture.owner.agent
        .post(`/api/v1/tickets/${ticket.id}/approvals`)
        .set('x-organization-id', fixture.organization.id)
        .send({
          approverId: fixture.admin.userId,
          comment: 'Please review this request.',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        ticketId: ticket.id,
        approverId: fixture.admin.userId,
        status: 'PENDING',
        comment: 'Please review this request.',
      });

      const job = await waitForEmailNotificationJob(notificationQueue, {
        recipientId: fixture.admin.userId,
      });

      expect(job.name).toBe(NOTIFICATION_JOBS.SEND_EMAIL);

      expect(job.data).toMatchObject({
        recipientIds: [fixture.admin.userId],
        actorId: fixture.owner.userId,
        organizationId: fixture.organization.id,
        subject: `Approval requested: ${ticket.ticketNumber}`,
      });

      expect(job.data.text).toContain('Approval Requested');
      expect(job.data.text).toContain(ticket.ticketNumber);
      expect(job.data.text).toContain('Please review this request.');

      expect(job.data.html).toContain('Approval Requested');
      expect(job.data.html).toContain(ticket.ticketNumber);
      expect(job.data.html).toContain('Please review this request.');
    });
  });

  describe('Approval approved notification', () => {
    it('should enqueue an email notification for the ticket requester', async () => {
      const { ticket, approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      await fixture.admin.agent
        .patch(
          `/api/v1/tickets/${approval.ticketId}/approvals/${approval.id}/approve`,
        )
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'Approved after review.',
        })
        .expect(200);

      const job = await waitForEmailNotificationJob(notificationQueue, {
        recipientId: fixture.owner.userId,
      });

      expect(job.name).toBe(NOTIFICATION_JOBS.SEND_EMAIL);

      expect(job.data).toMatchObject({
        recipientIds: [fixture.owner.userId],
        actorId: fixture.admin.userId,
        organizationId: fixture.organization.id,
        subject: `Approval approved: ${ticket.ticketNumber}`,
      });

      expect(job.data.text).toContain('Approval Approved');
      expect(job.data.text).toContain(ticket.ticketNumber);
      expect(job.data.text).toContain('Approved after review.');

      expect(job.data.html).toContain('Approval Approved');
      expect(job.data.html).toContain(ticket.ticketNumber);
      expect(job.data.html).toContain('Approved after review.');
    });
  });

  describe('Approval rejected notification', () => {
    it('should enqueue an email notification for the ticket requester', async () => {
      const { ticket, approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      await fixture.admin.agent
        .patch(
          `/api/v1/tickets/${approval.ticketId}/approvals/${approval.id}/reject`,
        )
        .set('x-organization-id', fixture.organization.id)
        .send({
          comment: 'Rejected after review.',
        })
        .expect(200);

      const job = await waitForEmailNotificationJob(notificationQueue, {
        recipientId: fixture.owner.userId,
      });

      expect(job.name).toBe(NOTIFICATION_JOBS.SEND_EMAIL);

      expect(job.data).toMatchObject({
        recipientIds: [fixture.owner.userId],
        actorId: fixture.admin.userId,
        organizationId: fixture.organization.id,
        subject: `Approval rejected: ${ticket.ticketNumber}`,
      });

      expect(job.data.text).toContain('Approval Rejected');
      expect(job.data.text).toContain(ticket.ticketNumber);
      expect(job.data.text).toContain('Rejected after review.');

      expect(job.data.html).toContain('Approval Rejected');
      expect(job.data.html).toContain(ticket.ticketNumber);
      expect(job.data.html).toContain('Rejected after review.');
    });
  });

  describe('Approval cancelled notification', () => {
    it('should enqueue an email notification for the assigned approver', async () => {
      const { ticket, approval } = await createPendingApproval(
        fixture,
        fixture.owner,
        fixture.admin,
      );

      const existingJobs = await notificationQueue.getJobs([
        'waiting',
        'active',
        'completed',
        'delayed',
        'failed',
      ]);

      const existingJobIds = new Set(
        existingJobs
          .map((job) => job.id)
          .filter((id): id is string | number => id !== undefined)
          .map(String),
      );

      await fixture.admin.agent
        .patch(
          `/api/v1/tickets/${approval.ticketId}/approvals/${approval.id}/cancel`,
        )
        .set('x-organization-id', fixture.organization.id)
        .expect(200);

      const job = await waitForEmailNotificationJob(notificationQueue, {
        recipientId: fixture.admin.userId,
        subject: `Approval cancelled: ${ticket.ticketNumber}`,
        excludeJobIds: existingJobIds,
      });

      expect(job.name).toBe(NOTIFICATION_JOBS.SEND_EMAIL);

      expect(job.data).toMatchObject({
        recipientIds: [fixture.admin.userId],
        actorId: fixture.admin.userId,
        organizationId: fixture.organization.id,
        subject: `Approval cancelled: ${ticket.ticketNumber}`,
      });

      expect(job.data.text).toContain('Approval Cancelled');
      expect(job.data.text).toContain(ticket.ticketNumber);
      expect(job.data.text).toContain('Please review this request.');

      expect(job.data.html).toContain('Approval Cancelled');
      expect(job.data.html).toContain(ticket.ticketNumber);
      expect(job.data.html).toContain('Please review this request.');
    });
  });
});
