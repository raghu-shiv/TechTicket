import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { DatabaseService } from '../../database/database.service';
import { StorageService } from '../../common/storage/storage.service';
import type { OrganizationContext } from '../../common/organization/organization.types';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',

  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',

  'text/plain',
  'text/csv',

  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

@Injectable()
export class TicketAttachmentsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly storage: StorageService,
  ) {}

  async create(
    context: OrganizationContext,
    ticketId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Attachment file is required');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'Attachment exceeds the maximum file size of 10 MB',
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported`,
      );
    }

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

    const objectKey = [
      'tickets',
      context.organizationId,
      ticket.id,
      'attachments',
      randomUUID(),
    ].join('/');

    await this.storage.upload({
      objectKey,
      data: file.buffer,
      size: file.size,
      contentType: file.mimetype,
    });

    try {
      return await this.database.ticketAttachment.create({
        data: {
          ticketId: ticket.id,
          uploadedById: context.userId,
          fileName: file.originalname,
          objectKey,
          mimeType: file.mimetype,
          size: file.size,
        },
        select: {
          id: true,
          ticketId: true,
          uploadedById: true,
          fileName: true,
          mimeType: true,
          size: true,
          createdAt: true,
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    } catch {
      try {
        await this.storage.delete(objectKey);
      } catch {
        // Preserve the original database error.
      }

      throw new InternalServerErrorException(
        'Unable to save attachment metadata',
      );
    }
  }

  async findAll(context: OrganizationContext, ticketId: string) {
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

    return this.database.ticketAttachment.findMany({
      where: {
        ticketId: ticket.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
        ticketId: true,
        uploadedById: true,
        fileName: true,
        mimeType: true,
        size: true,
        createdAt: true,
        uploadedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findOne(
    context: OrganizationContext,
    ticketId: string,
    attachmentId: string,
  ) {
    const attachment = await this.database.ticketAttachment.findFirst({
      where: {
        id: attachmentId,
        ticketId,
        ticket: {
          organizationId: context.organizationId,
        },
      },
      select: {
        id: true,
        ticketId: true,
        fileName: true,
        objectKey: true,
        mimeType: true,
        size: true,
      },
    });

    if (!attachment) {
      throw new NotFoundException('Attachment not found');
    }

    return attachment;
  }

  async download(
    context: OrganizationContext,
    ticketId: string,
    attachmentId: string,
  ) {
    const attachment = await this.findOne(context, ticketId, attachmentId);

    const object = await this.storage.get(attachment.objectKey);

    return {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      size: attachment.size,
      data: object.data,
    };
  }

  async remove(
    context: OrganizationContext,
    ticketId: string,
    attachmentId: string,
  ) {
    const attachment = await this.findOne(context, ticketId, attachmentId);

    /*
     * Keep a copy of the object so that it can be restored if
     * the database deletion fails after the MinIO deletion.
     */
    const object = await this.storage.get(attachment.objectKey);

    await this.storage.delete(attachment.objectKey);

    try {
      await this.database.ticketAttachment.delete({
        where: {
          id: attachment.id,
        },
      });
    } catch {
      try {
        await this.storage.upload({
          objectKey: attachment.objectKey,
          data: object.data,
          size: object.data.length,
          contentType: attachment.mimeType,
        });
      } catch {
        // At this point the original attachment state could not
        // be restored. Preserve the database error for the caller.
      }

      throw new InternalServerErrorException(
        'Unable to delete attachment metadata',
      );
    }

    return {
      id: attachment.id,
      deleted: true,
    };
  }
}
