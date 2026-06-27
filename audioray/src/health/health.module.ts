import { Module } from '@nestjs/common';
import { WhisperModule } from '../whisper/whisper.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [WhisperModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
