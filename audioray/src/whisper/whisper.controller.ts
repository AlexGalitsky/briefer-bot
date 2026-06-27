import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { WhisperService } from './whisper.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('api/whisper')
export class WhisperController {
  constructor(private readonly whisperService: WhisperService) {}

  @Post('transcribe')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file')) // Читаем файл прямо в буфер памяти
  async transcribeAudio(
    @UploadedFile() file: any, // Тип Any во избежание конфликтов Multer в NestJS 11
    @Body('speaker') speaker: string,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Аудиофайл (поле "file") не найден в запросе',
      );
    }
    if (!speaker?.trim()) {
      throw new BadRequestException('Имя спикера (поле "speaker") не указано');
    }

    const normalizedSpeaker = speaker.trim();
    if (normalizedSpeaker === 'Тишина') {
      return {
        speaker: normalizedSpeaker,
        text: '',
        processingTimeSec: '0.00',
        timestamp: new Date().toISOString(),
      };
    }

    const startTime = Date.now();

    const text = await this.whisperService.transcribeBuffer(
      file.buffer,
      normalizedSpeaker,
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Возвращаем результат обратно боту (или пишем в общую базу/вебсокеты)
    return {
      speaker: normalizedSpeaker,
      text,
      processingTimeSec: duration,
      timestamp: new Date().toISOString(),
    };
  }
}
