import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { TicketPriority } from '@prisma/client';

export class CreateSlaPolicyTargetDto {
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

export class CreateSlaPolicyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => CreateSlaPolicyTargetDto)
  targets!: CreateSlaPolicyTargetDto[];
}
