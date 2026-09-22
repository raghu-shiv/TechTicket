import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TicketCommentType } from '@prisma/client';

export class CreateTicketCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;

  @IsOptional()
  @IsEnum(TicketCommentType)
  type?: TicketCommentType;
}
