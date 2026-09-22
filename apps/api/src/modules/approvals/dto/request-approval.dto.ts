import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class RequestApprovalDto {
  @IsString()
  @IsUUID()
  approverId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
