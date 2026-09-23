export interface SendEmailNotificationJob {
  recipientIds: string[];
  actorId: string;
  organizationId: string;
  subject: string;
  html: string;
  text: string;
}
