import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ApprovalActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
