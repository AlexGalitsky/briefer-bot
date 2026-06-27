import {
  BadRequestException,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { IMeetingBot } from './interfaces/meeting-bot.interface';
import { YandexTelemostBot } from './bots/yandex-telemost.bot';
import { GoogleMeetBot } from './bots/google-meet.bot';
import { AudiorayService } from 'src/services/audioray.service';

@Injectable()
export class BotService implements OnApplicationShutdown {
  private readonly logger = new Logger(BotService.name);
  // Храним активного бота (в будущем тут может быть Map<string, IMeetingBot> для мульти-сессий)
  private activeBot: IMeetingBot | null = null;

  constructor(private readonly audiorayService: AudiorayService) {}

  // Автоматическое определение платформы по ссылке
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

    this.getBotStrategy(url);
  }

  async startBot(url: string, botName: string = 'Аура') {
    this.validateStart(url);

    // Получаем нужную стратегию на основе URL
    this.activeBot = this.getBotStrategy(url);

    try {
      await this.activeBot.start(url, botName);
      return { success: true, platform: this.activeBot.platformName };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Провал запуска стратегии ${this.activeBot?.platformName}: ${message}`,
      );
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
    this.activeBot = null;

    return {
      success: true,
      message: `Бот платформы ${platform} успешно остановлен.`,
    };
  }

  async onApplicationShutdown() {
    if (this.activeBot) {
      await this.activeBot.stop();
    }
  }
}
