import { Module } from '@nestjs/common';

import { DatabaseModule } from '../../database/database.module';
import { OrganizationContextService } from './organization-context.service';
import { OrganizationRoleGuard } from './organization-role.guard';

@Module({
  imports: [DatabaseModule],
  providers: [OrganizationContextService, OrganizationRoleGuard],
  exports: [OrganizationContextService, OrganizationRoleGuard],
})
export class OrganizationContextModule {}
