import { IsEnum } from 'class-validator';

import { SystemRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(SystemRole)
  role!: SystemRole;
}
