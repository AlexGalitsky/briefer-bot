import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudiorayClientModule } from 'src/audioray-client/audioray-client.module';
import { TranscriptsModule } from 'src/transcripts/transcripts.module';
import { MeetingTask } from './entities/meeting-task.entity';
import { MeetingSummary } from './entities/meeting-summary.entity';
import { SummariesService } from './summaries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingSummary, MeetingTask]),
    TranscriptsModule,
    AudiorayClientModule,
  ],
  providers: [SummariesService],
  exports: [SummariesService],
})
export class SummariesModule {}
