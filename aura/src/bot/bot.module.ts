import { Module } from '@nestjs/common';
import { MeetingsModule } from 'src/meetings/meetings.module';
import { TranscriptionModule } from 'src/transcription/transcription.module';
import { BotFactory } from './bot.factory';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [MeetingsModule, TranscriptionModule],
  providers: [BotService, BotFactory],
  exports: [BotService],
  controllers: [BotController],
})
export class BotModule {}
