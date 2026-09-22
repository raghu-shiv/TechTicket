import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

import { TicketPriority, TicketType } from '@prisma/client';

export class CreateTicketDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsEnum(TicketType)
  type?: TicketType;
}
