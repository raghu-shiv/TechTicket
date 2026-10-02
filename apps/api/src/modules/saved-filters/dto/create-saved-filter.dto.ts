import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import type {
  SavedFilterDefinition,
  SavedFilterSortField,
  SavedFilterSortOrder,
} from '../saved-filter.types';

export const SAVED_FILTER_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'priority',
  'status',
  'title',
] as const;

export const SAVED_FILTER_SORT_ORDERS = ['asc', 'desc'] as const;

export enum SavedFilterStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  PENDING = 'PENDING',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SavedFilterPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum SavedFilterType {
  INCIDENT = 'INCIDENT',
  SERVICE_REQUEST = 'SERVICE_REQUEST',
  QUESTION = 'QUESTION',
  PROBLEM = 'PROBLEM',
}

export class SavedFilterDefinitionDto implements SavedFilterDefinition {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsEnum(SavedFilterStatus)
  status?: SavedFilterStatus;

  @IsOptional()
  @IsEnum(SavedFilterPriority)
  priority?: SavedFilterPriority;

  @IsOptional()
  @IsEnum(SavedFilterType)
  type?: SavedFilterType;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @IsString()
  requesterId?: string;

  @IsOptional()
  @IsBoolean()
  unassigned?: boolean;

  @IsOptional()
  @IsBoolean()
  unassignedTeam?: boolean;

  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @IsOptional()
  @IsDateString()
  createdTo?: string;

  @IsOptional()
  @IsDateString()
  updatedFrom?: string;

  @IsOptional()
  @IsDateString()
  updatedTo?: string;

  @IsOptional()
  @IsEnum(SAVED_FILTER_SORT_FIELDS)
  sortBy?: SavedFilterSortField;

  @IsOptional()
  @IsEnum(SAVED_FILTER_SORT_ORDERS)
  sortOrder?: SavedFilterSortOrder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class CreateSavedFilterDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsObject()
  @ValidateNested()
  @Type(() => SavedFilterDefinitionDto)
  filters!: SavedFilterDefinitionDto;
}
