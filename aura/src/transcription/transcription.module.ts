import { Module } from '@nestjs/common';
import { BackendModule } from 'src/backend/backend.module';
import { MeetingsModule } from 'src/meetings/meetings.module';
import { AudiorayClient } from './audioray.client';

@Module({
  imports: [BackendModule, MeetingsModule],
  providers: [AudiorayClient],
  exports: [AudiorayClient],
})
export class TranscriptionModule {}
