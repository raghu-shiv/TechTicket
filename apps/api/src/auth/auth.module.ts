import { Module } from '@nestjs/common';

import { AuthContextService } from '../common/auth/auth-context.service';

@Module({
  providers: [AuthContextService],
  exports: [AuthContextService],
})
export class AuthModule {}
