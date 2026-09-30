import { IsEnum, IsOptional, IsString } from 'class-validator';
import { TicketActivityType } from '@prisma/client';

import {
  TICKET_ACTIVITY_CATEGORIES,
  type TicketActivityCategory,
} from '../ticket-activity.presentation.js';

export class TicketActivityQueryDto {
  @IsOptional()
  @IsEnum(TicketActivityType)
  type?: TicketActivityType;

  @IsOptional()
  @IsEnum(TICKET_ACTIVITY_CATEGORIES)
  category?: TicketActivityCategory;

  @IsOptional()
  @IsString()
  actorId?: string;
}
