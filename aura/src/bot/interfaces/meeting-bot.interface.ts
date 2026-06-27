import { Browser } from 'puppeteer';

export interface IMeetingBot {
  readonly platformName: string;
  start(url: string, botName: string): Promise<Browser>;
  stop(): Promise<void>;
  isActive(): boolean;
}
