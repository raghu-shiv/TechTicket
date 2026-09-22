import { IsOptional, IsString } from 'class-validator';

export class UpdateTicketAssignmentDto {
  @IsOptional()
  @IsString()
  assigneeId?: string | null;

  @IsOptional()
  @IsString()
  teamId?: string | null;
}
