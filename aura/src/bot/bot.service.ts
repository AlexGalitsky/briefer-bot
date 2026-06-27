import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';
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
    private readonly config: AppConfigService,
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

  createMeeting(url: string, botName?: string) {
    const platform = this.meetingsService.detectPlatform(url);
    const name = botName ?? this.config.values.bot.defaultName;
    return this.meetingsService.createMeeting(url, name, platform);
  }

  async startBot(url: string, botName: string, meetingId: string) {
    const platform = this.meetingsService.detectPlatform(url);
    this.activeBot = this.botFactory.create(platform);

    try {
      await this.activeBot.start(url, botName);
      this.meetingsService.setStatus(meetingId, 'active');
      return { success: true, platform: this.activeBot.platformName, meetingId };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Провал запуска стратегии ${this.activeBot?.platformName}: ${message}`,
      );
      this.meetingsService.setStatus(meetingId, 'failed');
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

    return {
      success: true,
      message: `Бот платформы ${platform} успешно остановлен.`,
      meetingId: meeting?.id ?? null,
    };
  }

  async onApplicationShutdown() {
    if (this.activeBot) {
      await this.activeBot.stop();
      this.meetingsService.endActiveMeeting();
    }
  }
}
