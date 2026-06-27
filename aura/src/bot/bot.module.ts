import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { AudiorayService } from 'src/services/audioray.service';

@Module({
  providers: [BotService, AudiorayService],
  exports: [BotService],
  controllers: [BotController],
})
export class BotModule {}
