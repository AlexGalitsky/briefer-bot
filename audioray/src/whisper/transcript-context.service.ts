import { Injectable } from '@nestjs/common';

@Injectable()
export class TranscriptContextService {
  private readonly maxWords = Number(process.env.WHISPER_CONTEXT_WORDS ?? 30);
  private recentText = '';

  getPrompt(): string {
    const context = this.recentText.trim();
    if (!context) {
      return 'Транскрипция русской речи.';
    }

    return `Транскрипция русской речи. Предыдущий контекст: ${context}`;
  }

  addText(text: string): void {
    const combined = `${this.recentText} ${text}`.trim();
    const words = combined.split(/\s+/);

    this.recentText =
      words.length > this.maxWords
        ? words.slice(-this.maxWords).join(' ')
        : combined;
  }
}
