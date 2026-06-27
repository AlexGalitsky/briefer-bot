import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { AppConfigService } from 'src/config/app-config.service';

@Injectable()
export class AudioConverterService {
  private readonly tempFolder: string;

  constructor(private readonly config: AppConfigService) {
    this.tempFolder = path.join(process.cwd(), this.config.values.paths.tempAudio);
  }

  ensureTempFolder(): void {
    if (!fs.existsSync(this.tempFolder)) {
      fs.mkdirSync(this.tempFolder, { recursive: true });
    }
  }

  convertWebmToWav16k(inputBuffer: Buffer): Promise<string> {
    this.ensureTempFolder();

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
}
