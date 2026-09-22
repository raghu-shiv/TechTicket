import { IsEmail, IsEnum } from 'class-validator';

import { SystemRole } from '@prisma/client';

export class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(SystemRole)
  role!: SystemRole;
}
