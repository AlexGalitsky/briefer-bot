import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  private readonly logger = new Logger(BotController.name);

  constructor(private readonly botService: BotService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  start(@Body() body: { url: string; name?: string }) {
    this.botService.validateStart(body.url);

    void this.botService.startBot(body.url, body.name).catch((error: Error) => {
      this.logger.error(
        `Ошибка запуска бота: ${error.message}`,
        error.stack,
      );
    });

    return { success: true, message: 'Команда на обработку встречи принята.' };
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stop() {
    return await this.botService.stopBot();
  }
}
