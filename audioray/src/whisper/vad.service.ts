import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';

@Injectable()
export class VadService {
  private readonly logger = new Logger(VadService.name);

  hasAudibleSpeech(wavPath: string): boolean {
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
}
