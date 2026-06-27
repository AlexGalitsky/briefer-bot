import { Logger } from '@nestjs/common';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { AudiorayClient } from 'src/transcription/audioray.client';
import { IMeetingBot } from './interfaces/meeting-bot.interface';

puppeteer.use(StealthPlugin());

export abstract class BaseBot implements IMeetingBot {
  protected abstract readonly logger: Logger;
  public abstract readonly platformName: string;
  protected browserInstance: Browser | null = null;

  constructor(protected readonly audiorayClient: AudiorayClient) {}

  async start(url: string, botName: string): Promise<Browser> {
    if (this.browserInstance) {
      throw new Error(
        `Бот для ${this.platformName} уже запущен в этой сессии.`,
      );
    }

    this.logger.log(`Инициализация Chromium для ${this.platformName}...`);

    this.browserInstance = await puppeteer.launch({
      headless: true,
      args: [
        '--use-fake-ui-for-media-stream',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--mute-audio',
      ],
    });

    try {
      const page = await this.browserInstance.newPage();
      await page.setViewport({ width: 1280, height: 720 });

      await page.setRequestInterception(true);
      page.on('request', (req) => {
        if (['image', 'media'].includes(req.resourceType())) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await this.handleMeetingFlow(page, url, botName);
      return this.browserInstance;
    } catch (error) {
      await this.stop();
      throw error;
    }
  }

  protected abstract handleMeetingFlow(
    page: Page,
    url: string,
    botName: string,
  ): Promise<void>;

  async stop(): Promise<void> {
    if (this.browserInstance) {
      await this.browserInstance.close();
      this.browserInstance = null;
      this.logger.log(`Бот ${this.platformName} успешно остановлен.`);
    }
  }

  isActive(): boolean {
    return this.browserInstance !== null;
  }
}
