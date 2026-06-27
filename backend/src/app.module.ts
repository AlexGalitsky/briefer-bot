import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigModule } from './config/app-config.module';
import { AppConfigService } from './config/app-config.service';
import { AuthModule } from './auth/auth.module';
import { OtpChallenge } from './auth/entities/otp-challenge.entity';
import { AuraClientModule } from './aura-client/aura-client.module';
import { JwtAuthGuard } from './common/guards/auth.guards';
import { HealthModule } from './health/health.module';
import { InternalModule } from './internal/internal.module';
import { Meeting } from './meetings/entities/meeting.entity';
import { MeetingsModule } from './meetings/meetings.module';
import { TranscriptSegment } from './transcripts/entities/transcript-segment.entity';
import { TranscriptsModule } from './transcripts/transcripts.module';
import { User } from './users/entities/user.entity';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        type: 'postgres',
        host: config.values.database.host,
        port: config.values.database.port,
        username: config.values.database.username,
        password: config.values.database.password,
        database: config.values.database.name,
        entities: [User, Meeting, TranscriptSegment, OtpChallenge],
        synchronize: config.values.database.synchronize,
      }),
    }),
    UsersModule,
    AuthModule,
    AuraClientModule,
    TranscriptsModule,
    MeetingsModule,
    InternalModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AppModule {}
