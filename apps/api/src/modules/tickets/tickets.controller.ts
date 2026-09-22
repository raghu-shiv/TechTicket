import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { AuthGuard } from '../../common/auth/auth.guard';

import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import { OrganizationRoles } from '../../common/organization/organization-role.decorator';
import { OrganizationRoleGuard } from '../../common/organization/organization-role.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketsService } from './tickets.service';
import { TicketAttachmentsService } from './ticket-attachments.service';
import { TicketRelationsService } from './ticket-relations.service';
import { CreateTicketRelationDto } from './dto/create-ticket-relation.dto';
import { UpdateTicketAssignmentDto } from './dto/update-ticket-assignment.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { CreateTicketCommentDto } from './dto/create-ticket-comment.dto';
import { UpdateTicketCommentDto } from './dto/update-ticket-comment.dto';
import { TicketActivityService } from './ticket-activity.service';

@Controller('tickets')
@UseGuards(AuthGuard, OrganizationGuard)
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly ticketAttachmentsService: TicketAttachmentsService,
    private readonly ticketRelationsService: TicketRelationsService,
    private readonly ticketActivityService: TicketActivityService,
  ) {}

  @Get()
  async getTickets(
    @OrganizationContextParam() context: OrganizationContext,
    @Query() query: ListTicketsDto,
  ) {
    return this.ticketsService.findAll(context, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      createdFrom: query.createdFrom,
      createdTo: query.createdTo,
      updatedFrom: query.updatedFrom,
      updatedTo: query.updatedTo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      status: query.status,
      priority: query.priority,
      type: query.type,
      assigneeId: query.assigneeId,
      teamId: query.teamId,
      requesterId: query.requesterId,
      unassigned: query.unassigned,
      unassignedTeam: query.unassignedTeam,
    });
  }

  @Get(':ticketId/attachments')
  async getTicketAttachments(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketAttachmentsService.findAll(context, ticketId);
  }

  @Get(':ticketId/attachments/:attachmentId')
  async downloadTicketAttachment(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    const attachment = await this.ticketAttachmentsService.download(
      context,
      ticketId,
      attachmentId,
    );

    return new StreamableFile(attachment.data, {
      type: attachment.mimeType,
      disposition: `attachment; filename="${attachment.fileName.replace(/["\\\r\n]/g, '_')}"`,
      length: attachment.size,
    });
  }

  @Delete(':ticketId/attachments/:attachmentId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async deleteTicketAttachment(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.ticketAttachmentsService.remove(
      context,
      ticketId,
      attachmentId,
    );
  }

  @Get(':ticketId')
  async getTicket(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketsService.findOne(context, ticketId);
  }

  @Get(':ticketId/relations')
  async getTicketRelations(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketRelationsService.findAll(
      ticketId,
      context.organizationId,
    );
  }

  @Post(':ticketId/relations')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async createTicketRelation(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateTicketRelationDto,
  ) {
    return this.ticketRelationsService.create(
      ticketId,
      context.organizationId,
      dto,
    );
  }

  @Delete(':ticketId/relations/:relationId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async deleteTicketRelation(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('relationId') relationId: string,
  ) {
    return this.ticketRelationsService.remove(
      ticketId,
      relationId,
      context.organizationId,
    );
  }

  @Post()
  async createTicket(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Body() dto: CreateTicketDto,
  ) {
    return this.ticketsService.create(context, {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      type: dto.type,
    });
  }

  @Patch(':ticketId/assignment')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async updateTicketAssignment(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketAssignmentDto,
  ) {
    return this.ticketsService.updateAssignment(
      context,
      ticketId,
      dto.assigneeId,
      dto.teamId,
    );
  }

  @Patch(':ticketId/status')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async updateTicketStatus(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketStatusDto,
  ) {
    return this.ticketsService.updateStatus(context, ticketId, dto.status);
  }

  @Get(':ticketId/activity')
  async getTicketActivity(
    @OrganizationContextParam() context: OrganizationContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketActivityService.findAll(context.organizationId, ticketId);
  }

  @Get(':ticketId/comments')
  async getTicketComments(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketsService.findComments(context, ticketId);
  }

  @Post(':ticketId/comments')
  async createTicketComment(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Body() dto: CreateTicketCommentDto,
  ) {
    return this.ticketsService.createComment(
      context,
      ticketId,
      dto.body,
      dto.type,
    );
  }

  @Patch(':ticketId/comments/:commentId')
  async updateTicketComment(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTicketCommentDto,
  ) {
    return this.ticketsService.updateComment(
      context,
      ticketId,
      commentId,
      dto.body,
    );
  }

  @Delete(':ticketId/comments/:commentId')
  async deleteTicketComment(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.ticketsService.removeComment(context, ticketId, commentId);
  }

  @Post(':ticketId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (_request, file, callback) => {
        const allowedTypes = new Set([
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

        if (!allowedTypes.has(file.mimetype)) {
          callback(
            new BadRequestException(
              `File type ${file.mimetype} is not supported`,
            ),
            false,
          );
          return;
        }

        callback(null, true);
      },
    }),
  )
  async uploadTicketAttachment(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.ticketAttachmentsService.create(context, ticketId, file);
  }

  @Patch(':ticketId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN', 'AGENT')
  async updateTicket(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(context, ticketId, {
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      type: dto.type,
    });
  }

  @Delete(':ticketId')
  @UseGuards(OrganizationRoleGuard)
  @OrganizationRoles('OWNER', 'ADMIN')
  async deleteTicket(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.ticketsService.remove(context, ticketId);
  }
}
