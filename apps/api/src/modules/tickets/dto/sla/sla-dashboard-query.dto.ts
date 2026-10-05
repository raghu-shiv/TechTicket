import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export enum SlaDashboardView {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  AT_RISK = 'AT_RISK',
  BREACHED = 'BREACHED',
  RESOLVED = 'RESOLVED',
  FIRST_RESPONSE_BREACHED = 'FIRST_RESPONSE_BREACHED',
  RESOLUTION_BREACHED = 'RESOLUTION_BREACHED',
}

export class SlaDashboardQueryDto {
  @IsOptional()
  @IsEnum(SlaDashboardView)
  view: SlaDashboardView = SlaDashboardView.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
