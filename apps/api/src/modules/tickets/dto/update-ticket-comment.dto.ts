import { IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateTicketCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  body!: string;
}
