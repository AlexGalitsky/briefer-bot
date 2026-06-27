import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { SummaryService } from './summary.service';

@Controller('api/summary')
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generate(@Body('transcript') transcript: string) {
    if (!transcript?.trim()) {
      throw new BadRequestException('Поле "transcript" обязательно');
    }

    const result = await this.summaryService.generateMeetingSummary(transcript);

    return {
      summaryMarkdown: result.summaryMarkdown,
      tasks: result.tasks,
      model: result.model,
      processingTimeSec: result.processingTimeSec.toFixed(2),
    };
  }
}
