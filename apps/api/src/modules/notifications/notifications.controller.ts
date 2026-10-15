import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../../common/auth/auth.guard';
import { OrganizationContextParam } from '../../common/organization/organization-context.decorator';
import { OrganizationGuard } from '../../common/organization/organization.guard';
import type { OrganizationContext } from '../../common/organization/organization.types';

import { ListNotificationsQueryDto } from './dto/list-notifications-query.dto';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(AuthGuard, OrganizationGuard)
export class NotificationsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Query() query: ListNotificationsQueryDto,
  ) {
    return this.notificationService.listForUser(context, query);
  }

  @Patch(':id/read')
  async markAsRead(
    @OrganizationContextParam()
    context: OrganizationContext,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.markAsRead(context, notificationId);
  }
}
