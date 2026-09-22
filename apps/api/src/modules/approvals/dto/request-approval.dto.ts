import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestApprovalDto {
  @IsString()
  approverId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
