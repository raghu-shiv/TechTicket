import { IsIn, IsOptional } from 'class-validator';

import { ListTicketsDto } from '../../tickets/dto/list-tickets.dto';

export class TicketLibraryReportQueryDto extends ListTicketsDto {
  @IsOptional()
  @IsIn(['createdAt', 'updatedAt'])
  dateField?: 'createdAt' | 'updatedAt' = 'createdAt';
}
