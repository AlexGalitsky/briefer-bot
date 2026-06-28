import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import {
  SUMMARY_QUEUE_NAME,
  SummaryJobPayload,
} from './summary-queue.constants';
import { SummariesService } from './summaries.service';

@Processor(SUMMARY_QUEUE_NAME)
export class SummaryProcessor extends WorkerHost {
  private readonly logger = new Logger(SummaryProcessor.name);

  constructor(private readonly summariesService: SummariesService) {
    super();
  }

  async process(job: Job<SummaryJobPayload>): Promise<void> {
    const { meetingId, regenerate } = job.data;
    this.logger.log(
      `Обработка выжимки ${meetingId} (job ${job.id}, regenerate=${regenerate ?? false})`,
    );

    if (regenerate) {
      await this.summariesService.regenerateForMeeting(meetingId);
    } else {
      await this.summariesService.generateForMeeting(meetingId);
    }
  }
}
