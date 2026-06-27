import { Module } from '@nestjs/common';
import { MeetingsModule } from 'src/meetings/meetings.module';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';

@Module({
  imports: [MeetingsModule],
  providers: [BotService],
  exports: [BotService],
  controllers: [BotController],
})
export class BotModule {}
