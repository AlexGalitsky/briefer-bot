import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { BackendClient } from 'src/backend/backend.client';
import { MeetingsService } from 'src/meetings/meetings.service';
import { BotFactory } from './bot.factory';
import { IMeetingBot } from './interfaces/meeting-bot.interface';

@Injectable()
export class BotService implements OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  private activeBot: IMeetingBot | null = null;

  constructor(
    private readonly botFactory: BotFactory,
    private readonly meetingsService: MeetingsService,
    private readonly backendClient: BackendClient,
  ) {}

  validateStart(url: string): void {
    if (!url?.trim()) {
      throw new BadRequestException('Поле "url" обязательно');
    }

    if (this.activeBot?.isActive()) {
      throw new BadRequestException(
        `Уже запущен активный бот для сессии: ${this.activeBot.platformName}`,
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
    this.activeBot = this.botFactory.create(platform);

    try {
      await this.activeBot.start(url, botName);
      this.meetingsService.setStatus(meetingId, 'active');
      void this.backendClient.updateMeetingStatus(meetingId, 'active');
      return { success: true, platform: this.activeBot.platformName, meetingId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Провал запуска стратегии ${this.activeBot?.platformName}: ${message}`,
      );
      this.meetingsService.setStatus(meetingId, 'failed');
      void this.backendClient.updateMeetingStatus(meetingId, 'failed');
      this.activeBot = null;
      throw error;
    }
  }

  async stopBot() {
    if (!this.activeBot) {
      return { success: false, message: 'Нет запущенных ботов.' };
    }

    await this.activeBot.stop();
    const platform = this.activeBot.platformName;
    const meeting = this.meetingsService.endActiveMeeting();
    this.activeBot = null;

    if (meeting) {
      void this.backendClient.updateMeetingStatus(meeting.id, 'ended');
    }

    return {
      success: true,
      message: `Бот платформы ${platform} успешно остановлен.`,
      meetingId: meeting?.id ?? null,
    };
  }

  async onApplicationShutdown() {
    if (this.activeBot) {
      await this.activeBot.stop();
      const meeting = this.meetingsService.endActiveMeeting();
      if (meeting) {
        void this.backendClient.updateMeetingStatus(meeting.id, 'ended');
      }
    }
  }

  getStatus() {
    const meeting = this.meetingsService.getActiveMeeting();
    return {
      active: this.activeBot?.isActive() ?? false,
      platform: this.activeBot?.platformName,
      meetingId: meeting?.id ?? null,
    };
  }
}
