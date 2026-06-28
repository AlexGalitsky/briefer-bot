import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { AuthModule } from './auth/auth.module';
import { MeetingSummary } from './summaries/entities/meeting-summary.entity';
import { MeetingTask } from './summaries/entities/meeting-task.entity';
import { OtpChallenge } from './auth/entities/otp-challenge.entity';
import { AuraClientModule } from './aura-client/aura-client.module';
import { JwtAuthGuard } from './common/guards/auth.guards';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';
import { Meeting } from './meetings/entities/meeting.entity';
import { MeetingsModule } from './meetings/meetings.module';
import { TranscriptSegment } from './transcripts/entities/transcript-segment.entity';
import { SummariesModule } from './summaries/summaries.module';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    BullModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        connection: {
          host: config.values.redis.host,
          port: config.values.redis.port,
          password: config.values.redis.password,
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        host: config.values.database.host,
        port: config.values.database.port,
        username: config.values.database.username,
        password: config.values.database.password,
        database: config.values.database.name,
        entities: [
          User,
          Meeting,
          TranscriptSegment,
          OtpChallenge,
          MeetingSummary,
          MeetingTask,
        ],
        synchronize: config.values.database.synchronize,
        migrations: [__dirname + '/migrations/*{.ts,.js}'],
        migrationsRun: config.values.database.migrationsRun,
      }),
    }),
    UsersModule,
    AuthModule,
    AuraClientModule,
    TranscriptsModule,
    MeetingsModule,
    SummariesModule,
    InternalModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
