import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';
import { MeetingStatus } from 'src/meetings/entities/meeting.entity';

export interface PushSegmentPayload {
  meetingId: string;
  speaker: string;
  text: string;
  startedAt: string;
  durationSec: number;
  source?: string;
}

@Injectable()
export class BackendClient {
  private readonly logger = new Logger(BackendClient.name);
  private readonly baseUrl: string;
  private readonly internalToken: string;

  constructor(private readonly config: AppConfigService) {
    this.baseUrl = this.config.values.backend.url.replace(/\/$/, '');
    this.internalToken = this.config.values.internal.apiToken;
  }

  async pushTranscriptSegment(payload: PushSegmentPayload): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/internal/transcript-segments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': this.internalToken,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.error(
          `Backend segment push failed: ${response.status} ${body.slice(0, 200)}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Backend segment push error: ${message}`);
    }
  }

  async updateMeetingStatus(
    meetingId: string,
    status: MeetingStatus,
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/internal/meetings/${meetingId}/status`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Token': this.internalToken,
          },
          body: JSON.stringify({ status }),
        },
      );

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(
          `Backend status update failed: ${response.status} ${body.slice(0, 200)}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Backend status update error: ${message}`);
    }
  }
}
