import { EmailService } from '../modules/notifications/email/email.service';

async function main() {
  const recipient = process.env.TEST_EMAIL_TO;

  if (!recipient) {
    throw new Error('TEST_EMAIL_TO environment variable is required');
  }

  const emailService = new EmailService();

  const result = await emailService.send({
    to: recipient,
    subject: 'TechTicket EmailService Test',
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>TechTicket Email Notification Test</h2>
        <p>This is a real test email sent through the TechTicket <strong>EmailService</strong>.</p>
        <p>If you received this message, the Resend integration is working.</p>
        <hr />
        <p style="color: #666;">
          This email was generated during Email Notification Infrastructure verification.
        </p>
      </div>
    `,
    text: `
TechTicket Email Notification Test

This is a real test email sent through the TechTicket EmailService.

If you received this message, the Resend integration is working.

This email was generated during Email Notification Infrastructure verification.
    `.trim(),
  });

  console.log(`TEST_EMAIL_SENT id=${result.id}`);
}

main().catch((error) => {
  console.error('TEST_EMAIL_FAILED');
  console.error(error);
  process.exit(1);
});
