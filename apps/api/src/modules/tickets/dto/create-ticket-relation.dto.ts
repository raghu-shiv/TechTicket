import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { TicketRelationType } from '@prisma/client';

export class CreateTicketRelationDto {
  @IsString()
  @IsNotEmpty()
  relatedTicketId!: string;

  @IsEnum(TicketRelationType)
  type!: TicketRelationType;
}
