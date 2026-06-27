import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class AudiorayService implements OnModuleInit {
  private readonly logger = new Logger(AudiorayService.name);
  private readonly outputFolder = path.join(process.cwd(), 'recordings');
  private readonly audiorayServerUrl =
    process.env.AUDIORAY_URL ??
    'http://localhost:3000/api/whisper/transcribe';

  onModuleInit() {
    this.logger.log(`Audioray endpoint: ${this.audiorayServerUrl}`);
    if (!fs.existsSync(this.outputFolder)) {
      fs.mkdirSync(this.outputFolder, { recursive: true });
      this.logger.log(
        `Создана папка для локальной записи аудио: ${this.outputFolder}`,
      );
    }
  }

  async sendAudioToAudioray(audioBuffer: Buffer, speakerName: string) {
    this.saveChunkToDisk(audioBuffer, speakerName);

    this.logger.log(
      `Отправка аудио-чанка (${audioBuffer.length} байт) спикера: ${speakerName}`,
    );

    // Пример интеграции через FormData (если ваш Whisper принимает файлы)
    const formData = new FormData();
    const uint8ArrayAudio = new Uint8Array(audioBuffer);
    const blob = new Blob([uint8ArrayAudio], {
      type: 'audio/webm;codecs=opus',
    });
    formData.append('file', blob, 'chunk.webm');
    formData.append('speaker', speakerName);

    try {
      const response = await fetch(this.audiorayServerUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        this.logger.log(`[Удаленный Audioray] ${data.speaker}: "${data.text}"`);
      } else {
        this.logger.error(
          `Сервер Audioray вернул ошибку: Код ${response.status}`,
        );
      }

      // ТОЧКА ИНТЕГРАЦИИ: Тут вы сохраняете текст в БД или отправляете в вебсокет фронтенда
      //return data.text;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка отправки в Audioray: ${message}`);
      throw error;
    }
  }

  private saveChunkToDisk(buffer: Buffer, speakerName: string) {
    try {
      // Форматируем имя файла: YYYYMMDD-HHMMSS_ИмяСпикера.webm
      const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-') // убираем недопустимые двоеточия из имени файла
        .replace('T', '_')
        .substring(0, 19); // оставляем только дату и время

      // Очищаем имя спикера от символов, которые запрещены в названиях файлов операционных систем
      const safeSpeakerName = speakerName
        .replace(/[/\\?%*:|"<>\s]/g, '_')
        .substring(0, 50); // ограничиваем длину

      const fileName = `${timestamp}_[${safeSpeakerName}].webm`;
      const filePath = path.join(this.outputFolder, fileName);

      fs.writeFileSync(filePath, buffer);
      this.logger.log(`[Диск] Чанк успешно сохранен: recordings/${fileName}`);
    } catch (error) {
      this.logger.error(`Не удалось сохранить чанк на диск: ${error.message}`);
    }
  }
}
