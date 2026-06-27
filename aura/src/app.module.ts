import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TelemostBotModule } from './telemost-bot/telemost-bot.module';

@Module({
  imports: [TelemostBotModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
