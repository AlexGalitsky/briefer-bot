import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';

export interface AuraStartResponse {
  success: boolean;
  meetingId: string;
  platform?: string;
  message?: string;
}

export interface AuraStopResponse {
  success: boolean;
  meetingId?: string | null;
  message?: string;
}

export interface AuraStatusResponse {
  active: boolean;
  activeCount?: number;
  maxConcurrent?: number;
  bots?: Array<{
    meetingId: string;
    platform: string;
    active: boolean;
  }>;
  platform?: string;
  meetingId?: string | null;
}

@Injectable()
export class AuraClient {
  private readonly logger = new Logger(AuraClient.name);
  private readonly baseUrl: string;
  private readonly internalToken: string;

  constructor(private readonly config: AppConfigService) {
    this.baseUrl = this.config.values.aura.url.replace(/\/$/, '');
    this.internalToken = this.config.values.aura.internalToken;
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Internal-Token': this.internalToken,
    };
  }

  async startBot(params: {
    meetingId: string;
    url: string;
    botName: string;
  }): Promise<AuraStartResponse> {
    const response = await fetch(`${this.baseUrl}/bot/start`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Aura start failed: ${response.status} ${body}`);
      throw new Error(`Aura start failed: ${response.status}`);
    }

    return (await response.json()) as AuraStartResponse;
  }

  async stopBot(meetingId: string): Promise<AuraStopResponse> {
    const response = await fetch(`${this.baseUrl}/bot/stop`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ meetingId }),
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(`Aura stop failed: ${response.status} ${body}`);
      throw new Error(`Aura stop failed: ${response.status}`);
    }

    return (await response.json()) as AuraStopResponse;
  }

  async getStatus(): Promise<AuraStatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/bot/status`, {
        headers: { 'X-Internal-Token': this.internalToken },
        signal: AbortSignal.timeout(3000),
      });

      if (!response.ok) {
        return { active: false };
      }

      return (await response.json()) as AuraStatusResponse;
    } catch {
      return { active: false };
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/bot/status`, {
        headers: { 'X-Internal-Token': this.internalToken },
        signal: AbortSignal.timeout(2000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
