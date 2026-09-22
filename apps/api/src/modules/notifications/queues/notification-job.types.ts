export interface SendEmailNotificationJob {
  recipientIds: string[];
  actorId: string;
  subject: string;
  html: string;
  text: string;
}
