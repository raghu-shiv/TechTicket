import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketActivityType } from '@prisma/client';

import {
  TICKET_ACTIVITY_CATEGORIES,
  type TicketActivityCategory,
} from '../ticket-activity.presentation.js';

export class TicketActivityQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  @IsOptional()
  @IsEnum(TicketActivityType)
  type?: TicketActivityType;

  @IsOptional()
  @IsIn(TICKET_ACTIVITY_CATEGORIES)
  category?: TicketActivityCategory;

  @IsOptional()
  @IsString()
  actorId?: string;
}
