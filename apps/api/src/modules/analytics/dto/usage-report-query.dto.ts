import { IsDateString, IsOptional } from 'class-validator';

export class UsageReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
