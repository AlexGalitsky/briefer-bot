import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { TranscriptContextService } from './transcript-context.service';
import { TranscriptionQueueService } from './transcription-queue.service';
import { WhisperWorkerService } from './whisper-worker.service';

@Injectable()
export class WhisperService implements OnModuleInit {
  private readonly logger = new Logger(WhisperService.name);
  private readonly projectRoot = path.resolve(__dirname, '..', '..');
  private readonly tempFolder = path.join(this.projectRoot, 'temp_audio');
  private readonly transcriptsFolder = path.join(this.projectRoot, 'transcripts');
  private readonly hallucinationPatterns = [
    /редактор\s+субтитров\s+а\.?\s*семкин\s+корректор\s+а\.?\s*егорова/gi,
    /банкин-корректор\s+егорова/gi,
    /продолжение\s+следует\.*/gi,
    /субтитры\s+(сделал|создавал|добавил)/gi,
    /subtitles?\s+by/gi,
    /amara\.org/gi,
  ];
  private readonly hallucinationOnlyPhrases = new Set([
    'редактор субтитров а семкин корректор а егорова',
    'продолжение следует',
    'продолжение следует...',
    'субтитры сделал dimatorzok',
    'thanks for watching',
  ]);

  constructor(
    private readonly whisperWorker: WhisperWorkerService,
    private readonly transcriptionQueue: TranscriptionQueueService,
    private readonly transcriptContext: TranscriptContextService,
  ) {}

  onModuleInit() {
    for (const folder of [this.tempFolder, this.transcriptsFolder]) {
      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
      }
    }

    this.logger.log(`Модель Whisper: ${this.whisperWorker.modelPath}`);
    this.logger.log(`Транскрипты сохраняются в: ${this.transcriptsFolder}`);
  }

  private convertWebmToWav16k(inputBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const tempInputPath = path.join(this.tempFolder, `${uniqueId}.webm`);
      const tempOutputPath = path.join(this.tempFolder, `${uniqueId}.wav`);

      fs.writeFileSync(tempInputPath, inputBuffer);

      ffmpeg(tempInputPath)
        .outputOptions(['-ar 16000', '-ac 1', '-c:a pcm_s16le'])
        .save(tempOutputPath)
        .on('end', () => {
          if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
          resolve(tempOutputPath);
        })
        .on('error', (err) => {
          if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
          if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
          reject(err);
        });
    });
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?…:;'"«»()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isHallucinationOnly(text: string): boolean {
    const normalized = this.normalizeText(text);
    if (!normalized) return true;

    return (
      this.hallucinationOnlyPhrases.has(normalized) ||
      [...this.hallucinationOnlyPhrases].some(
        (phrase) =>
          normalized.includes(phrase) &&
          normalized.length <= phrase.length + 15,
      )
    );
  }

  private stripHallucinations(text: string): string {
    let cleaned = text;

    for (const pattern of this.hallucinationPatterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }

    return cleaned.replace(/\s+/g, ' ').replace(/^[\s.,]+|[\s.,]+$/g, '').trim();
  }

  private hasAudibleSpeech(wavPath: string): boolean {
    const buffer = fs.readFileSync(wavPath);
    if (buffer.length <= 44) return false;

    const pcm = buffer.subarray(44);
    let sumSquares = 0;
    let peak = 0;
    let activeSamples = 0;
    const sampleCount = pcm.length / 2;

    for (let i = 0; i < pcm.length - 1; i += 2) {
      const sample = Math.abs(pcm.readInt16LE(i));
      peak = Math.max(peak, sample);
      sumSquares += sample * sample;
      if (sample > 800) activeSamples++;
    }

    const rms = Math.sqrt(sumSquares / sampleCount);
    const activeRatio = activeSamples / sampleCount;

    this.logger.debug(
      `Анализ аудио: rms=${rms.toFixed(0)}, peak=${peak}, active=${(activeRatio * 100).toFixed(1)}%`,
    );

    return peak > 1200 && rms > 250 && activeRatio > 0.03;
  }

  private saveTranscript(
    speaker: string,
    text: string,
    processingTimeSec: string,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      speaker,
      text,
      processingTimeSec,
    };

    const date = entry.timestamp.slice(0, 10);
    const jsonlPath = path.join(this.transcriptsFolder, `${date}.jsonl`);
    const txtPath = path.join(this.transcriptsFolder, `${date}.txt`);

    fs.appendFileSync(jsonlPath, `${JSON.stringify(entry)}\n`);
    fs.appendFileSync(
      txtPath,
      `[${entry.timestamp}] ${speaker}: ${text || '(пусто)'}\n`,
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
      wavPath = await this.convertWebmToWav16k(audioBuffer);
      this.logger.log(`Конвертация webm→wav завершена: ${path.basename(wavPath)}`);

      if (!this.hasAudibleSpeech(wavPath)) {
        this.logger.log('Чанк слишком тихий, пропускаем распознавание');
        return '';
      }

      const prompt = this.transcriptContext.getPrompt();
      const whisperStart = Date.now();
      const rawText = await this.whisperWorker.transcribe(wavPath, prompt);
      const whisperSec = ((Date.now() - whisperStart) / 1000).toFixed(2);
      this.logger.log(`Whisper обработал чанк за ${whisperSec}с`);

      if (this.isHallucinationOnly(rawText)) {
        this.logger.warn(`Отброшена галлюцинация Whisper: "${rawText}"`);
        return '';
      }

      const text = this.stripHallucinations(rawText);
      if (!text) {
        this.logger.warn(
          `После очистки галлюцинаций текст пуст (было: "${rawText}")`,
        );
        return '';
      }

      if (text !== rawText) {
        this.logger.warn(
          `Удалены фрагменты галлюцинаций: "${rawText}" → "${text}"`,
        );
      }

      this.transcriptContext.addText(text);

      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      this.logger.log(
        `Транскрибация завершена за ${durationSec}с: "${text}"`,
      );
      this.saveTranscript(speaker, text, durationSec);

      return text;
    } catch (error) {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Ошибка обработки чанка (спикер="${speaker}", ${durationSec}с): ${message}`,
      );
      return '';
    } finally {
      if (wavPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }
    }
  }
}
