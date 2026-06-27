import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { InternalApiGuard } from './common/guards/internal-api.guard';
import { BotModule } from './bot/bot.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [AppConfigModule, MeetingsModule, BotModule],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: InternalApiGuard }],
})
export class AppModule {}
