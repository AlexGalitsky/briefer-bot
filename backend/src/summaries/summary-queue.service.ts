import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AppConfigService } from 'src/config/app-config.service';
import {
  SUMMARY_QUEUE_NAME,
  SummaryJobPayload,
} from './summary-queue.constants';
import { SummariesService } from './summaries.service';

@Injectable()
export class SummaryQueueService {
  private readonly logger = new Logger(SummaryQueueService.name);

  constructor(
    @InjectQueue(SUMMARY_QUEUE_NAME)
    private readonly queue: Queue<SummaryJobPayload>,
    private readonly config: AppConfigService,
    private readonly summariesService: SummariesService,
  ) {}

  async enqueueGenerate(
    meetingId: string,
    regenerate = false,
  ): Promise<void> {
    if (!this.config.values.redis.enabled) {
      this.logger.debug(
        `Redis выключен — генерация выжимки in-process (${meetingId})`,
      );
      if (regenerate) {
        void this.summariesService.regenerateForMeeting(meetingId);
      } else {
        void this.summariesService.generateForMeeting(meetingId);
      }
      return;
    }

    const jobId = regenerate
      ? `summary-${meetingId}-${Date.now()}`
      : `summary-${meetingId}`;

    await this.queue.add(
      'generate',
      { meetingId, regenerate },
      {
        jobId,
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
        backoff: { type: 'exponential', delay: 5000 },
      },
    );

    this.logger.log(
      `Задача выжимки поставлена в очередь: ${meetingId} (regenerate=${regenerate})`,
    );
  }
}
