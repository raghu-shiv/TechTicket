import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Resend } from 'resend';

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  id: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend;
  private readonly from: string;

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;

    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not configured');
    }

    if (!from) {
      throw new Error('EMAIL_FROM environment variable is not configured');
    }

    this.resend = new Resend(apiKey);
    this.from = from;
  }

  async send(input: SendEmailInput): Promise<SendEmailResult> {
    const payload = {
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text !== undefined && {
        text: input.text,
      }),
      ...(input.replyTo !== undefined && {
        replyTo: input.replyTo,
      }),
    };

    const { data, error } = await this.resend.emails.send(
      payload as Parameters<typeof this.resend.emails.send>[0],
    );

    if (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error);

      throw new InternalServerErrorException('Failed to send email');
    }

    if (!data?.id) {
      this.logger.error('Email provider returned no message ID');

      throw new InternalServerErrorException(
        'Email provider returned an invalid response',
      );
    }

    this.logger.log(`Email sent successfully: id=${data.id}`);

    return {
      id: data.id,
    };
  }
}
