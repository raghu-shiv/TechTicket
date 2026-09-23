import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';

import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { Permissions } from '../../common/permissions/permission.decorator';
import { PermissionGuard } from '../../common/permissions/permission.guard';
import { PERMISSIONS } from '../../common/permissions/permission.types';

import { ApprovalActionDto } from './dto/approval-action.dto';
import { RequestApprovalDto } from './dto/request-approval.dto';
import { ApprovalsService } from './approvals.service';

@Controller()
@UseGuards(AuthGuard, OrganizationGuard, PermissionGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Post('tickets/:ticketId/approvals')
  @Permissions(PERMISSIONS.APPROVAL_REQUEST)
  async requestApproval(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Body() dto: RequestApprovalDto,
  ) {
    return this.approvalsService.requestApproval(
      context,
      ticketId,
      dto.approverId,
      dto.comment,
    );
  }

  @Get('tickets/:ticketId/approvals')
  @Permissions(PERMISSIONS.APPROVAL_VIEW)
  async getTicketApprovals(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
  ) {
    return this.approvalsService.findForTicket(context, ticketId);
  }

  @Get('approvals/:approvalId')
  @Permissions(PERMISSIONS.APPROVAL_VIEW)
  async getApproval(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('approvalId') approvalId: string,
  ) {
    return this.approvalsService.findOne(context, approvalId);
  }

  @Patch('tickets/:ticketId/approvals/:approvalId/approve')
  @Permissions(PERMISSIONS.APPROVAL_APPROVE)
  async approve(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvalsService.approve(
      context,
      ticketId,
      approvalId,
      dto.comment,
    );
  }

  @Patch('tickets/:ticketId/approvals/:approvalId/reject')
  @Permissions(PERMISSIONS.APPROVAL_REJECT)
  async reject(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('approvalId') approvalId: string,
    @Body() dto: ApprovalActionDto,
  ) {
    return this.approvalsService.reject(
      context,
      ticketId,
      approvalId,
      dto.comment,
    );
  }

  @Patch('tickets/:ticketId/approvals/:approvalId/cancel')
  @Permissions(PERMISSIONS.APPROVAL_CANCEL)
  async cancel(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('ticketId') ticketId: string,
    @Param('approvalId') approvalId: string,
  ) {
    return this.approvalsService.cancel(context, ticketId, approvalId);
  }
}
