import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { MeetingsService } from 'src/meetings/meetings.service';
import { TranscriptAggregatorService } from 'src/meetings/transcript-aggregator.service';

interface AudiorayTranscribeResponse {
  speaker: string;
  text: string;
  processingTimeSec: string;
  timestamp: string;
}

@Injectable()
export class AudiorayService implements OnModuleInit {
  private readonly logger = new Logger(AudiorayService.name);
  private readonly outputFolder = path.join(process.cwd(), 'recordings');
  private readonly audiorayServerUrl =
    process.env.AUDIORAY_URL ??
    'http://localhost:3000/api/whisper/transcribe';

  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptAggregator: TranscriptAggregatorService,
  ) {}

  onModuleInit() {
    this.logger.log(`Audioray endpoint: ${this.audiorayServerUrl}`);
    if (!fs.existsSync(this.outputFolder)) {
      fs.mkdirSync(this.outputFolder, { recursive: true });
      this.logger.log(
        `Создана папка для локальной записи аудио: ${this.outputFolder}`,
      );
    }
  }

  async sendAudioToAudioray(
    audioBuffer: Buffer,
    speakerName: string,
  ): Promise<AudiorayTranscribeResponse | null> {
    const meetingId = this.meetingsService.getActiveMeetingId();
    if (!meetingId) {
      this.logger.warn('Нет активной встречи — чанк пропущен');
      return null;
    }

    this.saveChunkToDisk(audioBuffer, speakerName);

    this.logger.log(
      `Отправка аудио-чанка (${audioBuffer.length} байт) спикера: ${speakerName}`,
    );

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], {
      type: 'audio/webm;codecs=opus',
    });
    formData.append('file', blob, 'chunk.webm');
    formData.append('speaker', speakerName);

    const response = await fetch(this.audiorayServerUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      this.logger.error(
        `Сервер Audioray вернул ошибку: Код ${response.status}`,
      );
      return null;
    }

    const data = (await response.json()) as AudiorayTranscribeResponse;
    this.logger.log(`[Audioray] ${data.speaker}: "${data.text}"`);

    if (data.text?.trim()) {
      this.transcriptAggregator.addSegment(meetingId, {
        speaker: data.speaker,
        text: data.text.trim(),
        startedAt: data.timestamp,
        durationSec: Number.parseFloat(data.processingTimeSec) || 0,
      });
    }

    return data;
  }

  private saveChunkToDisk(buffer: Buffer, speakerName: string) {
    try {
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .substring(0, 19);

      const safeSpeakerName = speakerName
        .replace(/[/\\?%*:|"<>\s]/g, '_')
        .substring(0, 50);

      const fileName = `${timestamp}_[${safeSpeakerName}].webm`;
      const filePath = path.join(this.outputFolder, fileName);

      fs.writeFileSync(filePath, buffer);
      this.logger.log(`[Диск] Чанк успешно сохранен: recordings/${fileName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Не удалось сохранить чанк на диск: ${message}`);
    }
  }
}
