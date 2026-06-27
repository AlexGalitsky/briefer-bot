import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BotModule } from './bot/bot.module';
import { MeetingsModule } from './meetings/meetings.module';

@Module({
  imports: [MeetingsModule, BotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
