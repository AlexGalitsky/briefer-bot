import { Module } from '@nestjs/common';
import { WhisperService } from './whisper.service';
import { WhisperController } from './whisper.controller';
import { WhisperWorkerService } from './whisper-worker.service';
import { TranscriptionQueueService } from './transcription-queue.service';
import { TranscriptContextService } from './transcript-context.service';

@Module({
  controllers: [WhisperController],
  providers: [
    WhisperWorkerService,
    TranscriptionQueueService,
    TranscriptContextService,
    WhisperService,
  ],
  exports: [
    WhisperWorkerService,
    TranscriptionQueueService,
    WhisperService,
  ],
})
export class WhisperModule {}
