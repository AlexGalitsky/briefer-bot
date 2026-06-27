import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { AppConfigService } from 'src/config/app-config.service';
import {
  TranscriptEntry,
  TranscriptStore,
} from './transcript-store.interface';

@Injectable()
export class FileTranscriptStore implements TranscriptStore, OnModuleInit {
  private readonly transcriptsFolder: string;

  constructor(private readonly config: AppConfigService) {
    this.transcriptsFolder = path.join(
      process.cwd(),
      this.config.values.paths.transcripts,
    );
  }

  onModuleInit() {
    if (!fs.existsSync(this.transcriptsFolder)) {
      fs.mkdirSync(this.transcriptsFolder, { recursive: true });
    }
  }

  save(entry: TranscriptEntry): void {
    const date = entry.timestamp.slice(0, 10);
    const jsonlPath = path.join(this.transcriptsFolder, `${date}.jsonl`);
    const txtPath = path.join(this.transcriptsFolder, `${date}.txt`);

    fs.appendFileSync(jsonlPath, `${JSON.stringify(entry)}\n`);
    fs.appendFileSync(
      txtPath,
      `[${entry.timestamp}] ${entry.speaker}: ${entry.text || '(пусто)'}\n`,
    );
  }
}
