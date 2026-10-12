import { IsEnum, IsOptional } from 'class-validator';
import { TicketApprovalStatus } from '@prisma/client';

export class ListApprovalsDto {
  @IsOptional()
  @IsEnum(TicketApprovalStatus)
  status?: TicketApprovalStatus;
}
