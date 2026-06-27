import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from 'src/config/app-config.service';
import { TRANSCRIPT_STORE } from 'src/transcription/transcript-store.interface';
import type { TranscriptStore } from 'src/transcription/transcript-store.interface';
import { AudioConverterService } from './audio-converter.service';
import { HallucinationFilterService } from './hallucination-filter.service';
import { TranscriptContextService } from './transcript-context.service';
import { TranscriptionQueueService } from './transcription-queue.service';
import { VadService } from './vad.service';
import { WhisperProcessService } from './whisper-process.service';

@Injectable()
export class WhisperService implements OnModuleInit {
  private readonly logger = new Logger(WhisperService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly whisperProcess: WhisperProcessService,
    private readonly audioConverter: AudioConverterService,
    private readonly vad: VadService,
    private readonly hallucinationFilter: HallucinationFilterService,
    private readonly transcriptionQueue: TranscriptionQueueService,
    private readonly transcriptContext: TranscriptContextService,
    @Inject(TRANSCRIPT_STORE)
    private readonly transcriptStore: TranscriptStore,
  ) {}

  onModuleInit() {
    this.audioConverter.ensureTempFolder();
    this.logger.log(`Модель Whisper: ${this.whisperProcess.modelPath}`);
    this.logger.log(
      `Транскрипты: ${this.config.values.paths.transcripts}/`,
    );
  }

  async transcribeBuffer(
    audioBuffer: Buffer,
    speaker = 'unknown',
  ): Promise<string> {
    return this.transcriptionQueue.enqueue(() =>
      this.processChunk(audioBuffer, speaker),
    );
  }

  private async processChunk(
    audioBuffer: Buffer,
    speaker: string,
  ): Promise<string> {
    let wavPath: string | null = null;
    const startTime = Date.now();

    this.logger.log(
      `Начало транскрибации: спикер="${speaker}", размер=${audioBuffer.length} байт, очередь=${this.transcriptionQueue.getDepth()}`,
    );

    try {
      wavPath = await this.audioConverter.convertWebmToWav16k(audioBuffer);
      this.logger.log(`Конвертация webm→wav: ${path.basename(wavPath)}`);

      if (!this.vad.hasAudibleSpeech(wavPath)) {
        this.logger.log('Чанк слишком тихий, пропускаем распознавание');
        return '';
      }

      const prompt = this.transcriptContext.getPrompt();
      const whisperStart = Date.now();
      const rawText = await this.whisperProcess.transcribe(wavPath, prompt);
      const whisperSec = ((Date.now() - whisperStart) / 1000).toFixed(2);
      this.logger.log(`Whisper обработал чанк за ${whisperSec}с`);

      if (this.hallucinationFilter.isHallucinationOnly(rawText)) {
        this.logger.warn(`Отброшена галлюцинация: "${rawText}"`);
        return '';
      }

      const text = this.hallucinationFilter.strip(rawText);
      if (!text) {
        this.logger.warn(`После очистки текст пуст (было: "${rawText}")`);
        return '';
      }

      if (text !== rawText) {
        this.logger.warn(`Очищено: "${rawText}" → "${text}"`);
      }

      this.transcriptContext.addText(text);

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(`Готово за ${durationSec}с: "${text}"`);

      this.transcriptStore.save({
        timestamp: new Date().toISOString(),
        speaker,
        text,
        processingTimeSec: durationSec,
      });

      return text;
    } catch (error) {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Ошибка (спикер="${speaker}", ${durationSec}с): ${message}`,
      );
      return '';
    } finally {
      if (wavPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }
    }
  }
}
