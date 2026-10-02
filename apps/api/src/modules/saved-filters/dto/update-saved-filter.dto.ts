import {
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { SavedFilterDefinitionDto } from './create-saved-filter.dto';

export class UpdateSavedFilterDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SavedFilterDefinitionDto)
  filters?: SavedFilterDefinitionDto;
}
