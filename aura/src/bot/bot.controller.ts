import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { BotService } from './bot.service';

@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  @Post('start')
  @HttpCode(HttpStatus.OK)
  async start(@Body() body: { url: string; name?: string }) {
    // Запускаем бота асинхронно, не заставляя HTTP-клиент ждать окончания созвона
    this.botService.startBot(body.url, body.name).catch(() => {});
    return { success: true, message: 'Команда на обработку встречи принята.' };
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stop() {
    return await this.botService.stopBot();
  }
}
