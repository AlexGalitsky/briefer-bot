import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { MeetingsService } from 'src/meetings/meetings.service';
import { AudiorayService } from 'src/services/audioray.service';
import { GoogleMeetBot } from './bots/google-meet.bot';
import { YandexTelemostBot } from './bots/yandex-telemost.bot';
import { IMeetingBot } from './interfaces/meeting-bot.interface';

@Injectable()
export class BotService implements OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  private activeBot: IMeetingBot | null = null;
  private activeMeetingId: string | null = null;

  constructor(
    private readonly audiorayService: AudiorayService,
    private readonly meetingsService: MeetingsService,
  ) {}

  private getBotStrategy(url: string): IMeetingBot {
    if (url.includes('telemost.yandex')) {
      return new YandexTelemostBot(this.audiorayService);
    }
    if (url.includes('meet.google.com')) {
      return new GoogleMeetBot(this.audiorayService);
    }
    throw new BadRequestException(
      'Указанная платформа не поддерживается ботом.',
    );
  }

  validateStart(url: string): void {
    if (!url?.trim()) {
      throw new BadRequestException('Поле "url" обязательно');
    }

    if (this.activeBot && this.activeBot.isActive()) {
      throw new BadRequestException(
        `Уже запущен активный бот для сессии: ${this.activeBot.platformName}`,
      );
    }

    this.meetingsService.detectPlatform(url);
  }

  createMeeting(url: string, botName: string) {
    const platform = this.meetingsService.detectPlatform(url);
    return this.meetingsService.createMeeting(url, botName, platform);
  }

  async startBot(url: string, botName: string, meetingId: string) {
    this.activeMeetingId = meetingId;
    this.activeBot = this.getBotStrategy(url);

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
      this.activeMeetingId = null;
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
    this.activeMeetingId = null;

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
