import {
  BadRequestException,
  Body,
  Controller,
  Get,
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
  start(
    @Body()
    body: {
      url: string;
      botName?: string;
      name?: string;
      meetingId: string;
    },
  ) {
    if (!body.meetingId?.trim()) {
      throw new BadRequestException('Поле "meetingId" обязательно');
    }

    const botName = body.botName ?? body.name ?? 'Аура';
    this.botService.validateStart(body.url, body.meetingId);

    this.botService.registerMeeting(body.meetingId, body.url, botName);

    void this.botService
      .startBot(body.url, botName, body.meetingId)
      .catch((error: Error) => {
        this.logger.error(
          `Ошибка запуска бота: ${error.message}`,
          error.stack,
        );
      });

    return {
      success: true,
      meetingId: body.meetingId,
      message: 'Команда на обработку встречи принята.',
    };
  }

  @Post('stop')
  @HttpCode(HttpStatus.OK)
  async stop(@Body() body: { meetingId?: string } = {}) {
    return await this.botService.stopBot(body.meetingId);
  }

  @Get('status')
  getStatus() {
    return this.botService.getStatus();
  }
}
