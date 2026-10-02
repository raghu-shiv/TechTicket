import { Module } from '@nestjs/common';

import { SavedFilterService } from './saved-filter.service';

@Module({
  providers: [SavedFilterService],
  exports: [SavedFilterService],
})
export class SavedFilterModule {}
