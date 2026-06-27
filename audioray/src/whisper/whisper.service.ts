import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import whisper from 'whisper-node';
import * as path from 'path';
import * as fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';

@Injectable()
export class WhisperService implements OnModuleInit {
  private readonly logger = new Logger(WhisperService.name);
  private modelPath: string;
  private readonly tempFolder = path.join(process.cwd(), 'temp_audio');

  async onModuleInit() {
    // Путь к файлу модели в корне проекта
    this.modelPath = path.resolve(
      process.cwd(),
      'models',
      'ggml-large-v3-turbo.bin',
    );

    // Создаем папку для временной конвертации файлов
    if (!fs.existsSync(this.tempFolder)) {
      fs.mkdirSync(this.tempFolder, { recursive: true });
    }

    // Проверяем наличие модели
    if (!fs.existsSync(this.modelPath)) {
      this.logger.error(`==================================================`);
      this.logger.error(`КРИТИЧЕСКАЯ ОШИБКА: Модель не найдена!`);
      this.logger.error(
        `Скачайте модель ggml-base.bin и положите её в /models`,
      );
      this.logger.error(`==================================================`);
    }
  }

  /**
   * Конвертирует WebM/Opus буфер из сети в строгий WAV (16000Hz, Mono, PCM 16-bit)
   */
  private convertWebmToWav16k(inputBuffer: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const uniqueId = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
      const tempInputPath = path.join(this.tempFolder, `${uniqueId}.webm`);
      const tempOutputPath = path.join(this.tempFolder, `${uniqueId}.wav`);

      // Записываем полученный из HTTP-запроса буфер на диск
      fs.writeFileSync(tempInputPath, inputBuffer);

      // Конвертируем под жесткие требования whisper.cpp
      ffmpeg(tempInputPath)
        .outputOptions([
          '-ar 16000', // 16кГц частота
          '-ac 1', // моно-канал
          '-c:a pcm_s16le', // кодек PCM 16-bit
        ])
        .save(tempOutputPath)
        .on('end', () => {
          if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
          resolve(tempOutputPath);
        })
        .on('error', (err) => {
          if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
          reject(err);
        });
    });
  }

  /**
   * Главный метод обработки аудио-чанка
   */
  async transcribeBuffer(audioBuffer: Buffer): Promise<string> {
    let wavPath: string | null = null;

    try {
      // 1. Конвертируем webm в wav
      wavPath = await this.convertWebmToWav16k(audioBuffer);

      // 2. Вызываем локальное С++ ядро Whisper
      const result = await whisper(wavPath, {
        model: this.modelPath,
        language: 'ru', // Принудительный русский язык для точности
      });

      // 3. Форматируем результат
      if (Array.isArray(result)) {
        return result.map((segment: any) => segment.text).join(' ').trim();
      }
      return String(result).trim();

    } catch (error) {
      this.logger.error(
        `Ошибка обработки чанка в whisper.cpp: ${error.message}`,
      );
      return '';
    } finally {
      // 4. Гарантированно удаляем временный wav файл, чтобы не забивать диск сервера
      if (wavPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath);
      }
    }
  }
}