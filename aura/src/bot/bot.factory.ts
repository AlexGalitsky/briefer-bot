import { BadRequestException, Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';
import { AudiorayClient } from 'src/transcription/audioray.client';
import { IMeetingBot } from './interfaces/meeting-bot.interface';
import { GoogleMeetBot } from './platforms/google-meet/google-meet.bot';
import { YandexTelemostBot } from './platforms/telemost/telemost.bot';

@Injectable()
export class BotFactory {
  constructor(
    private readonly audiorayClient: AudiorayClient,
    private readonly config: AppConfigService,
  ) {}

  create(platform: string, meetingId: string): IMeetingBot {
    switch (platform) {
      case 'yandex-telemost':
        return new YandexTelemostBot(
          this.audiorayClient,
          this.config,
          meetingId,
        );
      case 'google-meet':
        return new GoogleMeetBot(this.audiorayClient, meetingId);
      default:
        throw new BadRequestException(
          `Платформа не поддерживается: ${platform}`,
        );
    }
  }
}
