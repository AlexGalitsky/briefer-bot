import { Module } from '@nestjs/common';
import { FileTranscriptStore } from './file-transcript.store';
import { TRANSCRIPT_STORE } from './transcript-store.interface';

@Module({
  providers: [
    FileTranscriptStore,
    { provide: TRANSCRIPT_STORE, useExisting: FileTranscriptStore },
  ],
  exports: [TRANSCRIPT_STORE, FileTranscriptStore],
})
export class TranscriptionModule {}
