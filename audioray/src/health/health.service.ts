import { Injectable } from '@nestjs/common';
import { execFile } from 'child_process';
import * as fs from 'fs';
import { promisify } from 'util';
import { TranscriptionQueueService } from '../whisper/transcription-queue.service';
import { WhisperProcessService } from '../whisper/whisper-process.service';

const execFileAsync = promisify(execFile);

export interface HealthCheckResult {
  status: 'ok' | 'degraded';
  checks: {
    model: boolean;
    ffmpeg: boolean;
    whisperServer: boolean;
    queueDepth: number;
  };
}

@Injectable()
export class HealthService {
  constructor(
    private readonly whisperProcess: WhisperProcessService,
    private readonly transcriptionQueue: TranscriptionQueueService,
  ) {}

  async check(): Promise<HealthCheckResult> {
    const [ffmpeg, whisperServer] = await Promise.all([
      this.checkFfmpeg(),
      this.whisperProcess.ping(),
    ]);

    const model = fs.existsSync(this.whisperProcess.modelPath);
    const queueDepth = this.transcriptionQueue.getDepth();

    const checks = { model, ffmpeg, whisperServer, queueDepth };
    const status =
      model && ffmpeg && whisperServer ? 'ok' : ('degraded' as const);

    return { status, checks };
  }

  private async checkFfmpeg(): Promise<boolean> {
    try {
      await execFileAsync('ffmpeg', ['-version']);
      return true;
    } catch {
      return false;
    }
  }
}
