import { Injectable } from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';

@Injectable()
export class TranscriptContextService {
  private recentText = '';

  constructor(private readonly config: AppConfigService) {}

  getPrompt(): string {
    const context = this.recentText.trim();
    if (!context) {
      return 'Транскрипция русской речи.';
    }
    return `Транскрипция русской речи. Предыдущий контекст: ${context}`;
  }

  addText(text: string): void {
    const maxWords = this.config.values.whisper.contextWords;
    const combined = `${this.recentText} ${text}`.trim();
    const words = combined.split(/\s+/);

    this.recentText =
      words.length > maxWords
        ? words.slice(-maxWords).join(' ')
        : combined;
  }
}
