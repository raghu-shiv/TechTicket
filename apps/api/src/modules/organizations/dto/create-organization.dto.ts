import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
