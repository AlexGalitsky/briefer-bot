import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { WhisperModule } from './whisper/whisper.module';

@Module({
  imports: [WhisperModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
