import { Module } from '@nestjs/common';
import { TelemostBotService } from './telemost-bot.service';

@Module({
  providers: [TelemostBotService]
})
export class TelemostBotModule {}
