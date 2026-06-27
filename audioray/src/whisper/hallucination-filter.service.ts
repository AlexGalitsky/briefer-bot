import { Injectable } from '@nestjs/common';

@Injectable()
export class HallucinationFilterService {
  private readonly patterns = [
    /редактор\s+субтитров\s+а\.?\s*семкин\s+корректор\s+а\.?\s*егорова/gi,
    /банкин-корректор\s+егорова/gi,
    /продолжение\s+следует\.*/gi,
    /субтитры\s+(сделал|создавал|добавил)/gi,
    /subtitles?\s+by/gi,
    /amara\.org/gi,
  ];

  private readonly onlyPhrases = new Set([
    'редактор субтитров а семкин корректор а егорова',
    'продолжение следует',
    'продолжение следует...',
    'субтитры сделал dimatorzok',
    'thanks for watching',
  ]);

  isHallucinationOnly(text: string): boolean {
    const normalized = this.normalize(text);
    if (!normalized) return true;

    return (
      this.onlyPhrases.has(normalized) ||
      [...this.onlyPhrases].some(
        (phrase) =>
          normalized.includes(phrase) &&
          normalized.length <= phrase.length + 15,
      )
    );
  }

  strip(text: string): string {
    let cleaned = text;
    for (const pattern of this.patterns) {
      cleaned = cleaned.replace(pattern, ' ');
    }
    return cleaned.replace(/\s+/g, ' ').replace(/^[\s.,]+|[\s.,]+$/g, '').trim();
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,!?…:;'"«»()-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
