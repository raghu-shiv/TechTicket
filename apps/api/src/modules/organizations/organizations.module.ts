import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [AuthModule, OrganizationContextModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
