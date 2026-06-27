import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { BotModule } from './bot/bot.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [AppConfigModule, MeetingsModule, BotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
