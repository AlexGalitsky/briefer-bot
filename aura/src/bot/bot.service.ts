import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { BackendClient } from 'src/backend/backend.client';
import { AppConfigService } from 'src/config/app-config.service';
import { MeetingsService } from 'src/meetings/meetings.service';
import { BotFactory } from './bot.factory';
import { IMeetingBot } from './interfaces/meeting-bot.interface';

@Injectable()
export class BotService implements OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  private readonly activeBots = new Map<string, IMeetingBot>();

  constructor(
    private readonly botFactory: BotFactory,
    private readonly meetingsService: MeetingsService,
    private readonly backendClient: BackendClient,
    private readonly config: AppConfigService,
  ) {}

  validateStart(url: string, meetingId: string): void {
    if (!url?.trim()) {
      throw new BadRequestException('Поле "url" обязательно');
    }

    if (this.activeBots.has(meetingId)) {
      throw new BadRequestException(
        `Бот для встречи ${meetingId} уже запущен`,
      );
    }

    const maxConcurrent = this.config.values.bot.maxConcurrent;
    if (this.activeBots.size >= maxConcurrent) {
      throw new BadRequestException(
        `Достигнут лимит одновременных ботов (${maxConcurrent}). Остановите один из активных.`,
      );
    }

    this.meetingsService.detectPlatform(url);
  }

  registerMeeting(meetingId: string, url: string, botName: string) {
    const platform = this.meetingsService.detectPlatform(url);
    return this.meetingsService.registerMeeting(
      meetingId,
      url,
      botName,
      platform,
    );
  }

  async startBot(url: string, botName: string, meetingId: string) {
    const platform = this.meetingsService.detectPlatform(url);
    const bot = this.botFactory.create(platform, meetingId);
    this.activeBots.set(meetingId, bot);

    try {
      await bot.start(url, botName);
      this.meetingsService.setStatus(meetingId, 'active');
      void this.backendClient.updateMeetingStatus(meetingId, 'active');
      return { success: true, platform: bot.platformName, meetingId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Провал запуска стратегии ${bot.platformName} (${meetingId}): ${message}`,
      );
      this.meetingsService.setStatus(meetingId, 'failed');
      void this.backendClient.updateMeetingStatus(meetingId, 'failed');
      this.activeBots.delete(meetingId);
      throw error;
    }
  }

  async stopBot(meetingId?: string) {
    if (this.activeBots.size === 0) {
      return { success: false, message: 'Нет запущенных ботов.' };
    }

    const targetId = meetingId ?? this.getFirstActiveMeetingId();
    if (!targetId) {
      return { success: false, message: 'Нет запущенных ботов.' };
    }

    const bot = this.activeBots.get(targetId);
    if (!bot) {
      throw new NotFoundException(`Бот для встречи ${targetId} не найден`);
    }

    await bot.stop();
    const platform = bot.platformName;
    this.activeBots.delete(targetId);
    const meeting = this.meetingsService.endMeeting(targetId);

    if (meeting) {
      void this.backendClient.updateMeetingStatus(meeting.id, 'ended');
    }

    return {
      success: true,
      message: `Бот платформы ${platform} успешно остановлен.`,
      meetingId: targetId,
    };
  }

  private getFirstActiveMeetingId(): string | null {
    const ids = [...this.activeBots.keys()];
    return ids[0] ?? null;
  }

  async onApplicationShutdown() {
    for (const meetingId of [...this.activeBots.keys()]) {
      try {
        await this.stopBot(meetingId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Shutdown stop failed (${meetingId}): ${message}`);
      }
    }
  }

  getStatus() {
    const bots = [...this.activeBots.entries()].map(([meetingId, bot]) => ({
      meetingId,
      platform: bot.platformName,
      active: bot.isActive(),
    }));

    return {
      active: bots.length > 0,
      activeCount: bots.length,
      maxConcurrent: this.config.values.bot.maxConcurrent,
      bots,
      /** Первый активный бот — для обратной совместимости */
      platform: bots[0]?.platform,
      meetingId: bots[0]?.meetingId ?? null,
    };
  }
}
