import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';

export interface AudioraySummaryTask {
  title: string;
  assignee?: string | null;
  dueDate?: string | null;
}

export interface AudioraySummaryResponse {
  summaryMarkdown: string;
  tasks: AudioraySummaryTask[];
  model: string;
  processingTimeSec: string;
}

@Injectable()
export class AudiorayClient {
  private readonly logger = new Logger(AudiorayClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: AppConfigService) {
    this.baseUrl = this.config.values.audioray.url.replace(/\/$/, '');
  }

  async generateSummary(transcript: string): Promise<AudioraySummaryResponse> {
    const response = await fetch(`${this.baseUrl}/api/summary/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Audioray summary failed: ${response.status} ${body}`);
      throw new Error(`Audioray summary failed: ${response.status}`);
    }

    return (await response.json()) as AudioraySummaryResponse;
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
