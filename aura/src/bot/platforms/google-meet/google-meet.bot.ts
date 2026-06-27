import { Logger } from '@nestjs/common';
import { Page } from 'puppeteer';
import { BaseBot } from '../../base-bot';

export class GoogleMeetBot extends BaseBot {
  protected readonly logger = new Logger(GoogleMeetBot.name);
  public readonly platformName = 'google-meet';

  protected async handleMeetingFlow(
    page: Page,
    url: string,
    botName: string,
  ): Promise<void> {
    this.logger.log(botName);
    await page.goto(url, { waitUntil: 'networkidle2' });
    this.logger.log('Логика Google Meet будет здесь');
  }
}
