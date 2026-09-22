import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class UpdateSlaPolicyTargetDto {
  @IsEnum(TicketPriority)
  priority!: TicketPriority;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  firstResponseMinutes!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  resolutionMinutes!: number;
}

export class UpdateSlaPolicyDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => UpdateSlaPolicyTargetDto)
  targets?: UpdateSlaPolicyTargetDto[];
}
