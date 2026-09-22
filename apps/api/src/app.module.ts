import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { OrganizationContextModule } from './common/organization/organization-context.module';
import { HealthModule } from './modules/health/health.module';
import { MembersModule } from './modules/members/members.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { TeamsModule } from './modules/teams/teams.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { StorageModule } from './common/storage/storage.module';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST ?? 'redis',
        port: Number(process.env.REDIS_PORT ?? 6379),
      },
    }),
    DatabaseModule,
    AuthModule,
    OrganizationContextModule,
    StorageModule,
    HealthModule,
    OrganizationsModule,
    MembersModule,
    TeamsModule,
    TicketsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
