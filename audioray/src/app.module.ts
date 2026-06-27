import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/app-config.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthModule } from './health/health.module';
import { SummaryModule } from './summary/summary.module';
import { WhisperModule } from './whisper/whisper.module';

@Module({
  imports: [AppConfigModule, WhisperModule, SummaryModule, HealthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
