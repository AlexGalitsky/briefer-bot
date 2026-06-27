import { Module } from '@nestjs/common';
import { MeetingsModule } from 'src/meetings/meetings.module';
import { TranscriptsModule } from 'src/transcripts/transcripts.module';
import { InternalController } from './internal.controller';

@Module({
  imports: [TranscriptsModule, MeetingsModule],
  controllers: [InternalController],
})
export class InternalModule {}
