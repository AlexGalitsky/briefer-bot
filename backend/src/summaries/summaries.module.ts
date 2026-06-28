import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AudiorayClientModule } from 'src/audioray-client/audioray-client.module';
import { TranscriptsModule } from 'src/transcripts/transcripts.module';
import { MeetingTask } from './entities/meeting-task.entity';
import { MeetingSummary } from './entities/meeting-summary.entity';
import { SUMMARY_QUEUE_NAME } from './summary-queue.constants';
import { SummaryExportService } from './summary-export.service';
import { SummaryProcessor } from './summary.processor';
import { SummaryQueueService } from './summary-queue.service';
import { SummariesService } from './summaries.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MeetingSummary, MeetingTask]),
    TranscriptsModule,
    AudiorayClientModule,
    BullModule.registerQueue({ name: SUMMARY_QUEUE_NAME }),
  ],
  providers: [
    SummariesService,
    SummaryQueueService,
    SummaryProcessor,
    SummaryExportService,
  ],
  exports: [SummariesService, SummaryQueueService, SummaryExportService],
})
export class SummariesModule {}
