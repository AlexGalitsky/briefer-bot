import { Injectable, Logger } from '@nestjs/common';
import {
  SendSmsOptions,
  SmsGateway,
} from './sms-gateway.interface';

@Injectable()
export class ConsoleSmsGateway implements SmsGateway {
  private readonly logger = new Logger(ConsoleSmsGateway.name);

  async send(options: SendSmsOptions): Promise<void> {
    this.logger.log(`[SMS → ${options.phone}] ${options.message}`);
  }
}
