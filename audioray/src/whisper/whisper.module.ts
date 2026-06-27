import { Module } from '@nestjs/common';
import { TranscriptionModule } from 'src/transcription/transcription.module';
import { AudioConverterService } from './audio-converter.service';
import { HallucinationFilterService } from './hallucination-filter.service';
import { TranscriptContextService } from './transcript-context.service';
import { TranscriptionQueueService } from './transcription-queue.service';
import { VadService } from './vad.service';
import { WhisperController } from './whisper.controller';
import { WhisperProcessService } from './whisper-process.service';
import { WhisperService } from './whisper.service';

@Module({
  imports: [TranscriptionModule],
  controllers: [WhisperController],
  providers: [
    WhisperProcessService,
    AudioConverterService,
    VadService,
    HallucinationFilterService,
    TranscriptionQueueService,
    TranscriptContextService,
    WhisperService,
  ],
  exports: [
    WhisperProcessService,
    TranscriptionQueueService,
    WhisperService,
  ],
})
export class WhisperModule {}
