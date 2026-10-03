import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { OrganizationContextModule } from '../../common/organization/organization-context.module';

import { SavedFilterController } from './saved-filter.controller';
import { SavedFilterService } from './saved-filter.service';

@Module({
  imports: [AuthModule, OrganizationContextModule],
  controllers: [SavedFilterController],
  providers: [SavedFilterService],
  exports: [SavedFilterService],
})
export class SavedFilterModule {}
