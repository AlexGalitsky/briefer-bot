import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppConfigService } from 'src/config/app-config.service';
import type { GenerateSummaryResult, SummaryTask } from './summary.types';

interface OllamaGenerateResponse {
  response?: string;
}

@Injectable()
export class SummaryService {
  private readonly logger = new Logger(SummaryService.name);

  constructor(private readonly config: AppConfigService) {}

  async generateMeetingSummary(transcript: string): Promise<GenerateSummaryResult> {
    const trimmed = transcript.trim();
    if (!trimmed) {
      throw new BadRequestException('Стенограмма пуста');
    }

    const { url, model, temperature, timeoutMs } = this.config.values.ollama;
    const started = Date.now();

    this.logger.log(`Запуск суммаризации через Ollama (${model})...`);

    const prompt = this.buildPrompt(trimmed);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature },
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Ollama вернула ошибку: HTTP ${response.status}`,
        );
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      const rawResponse = data.response?.trim() ?? '';

      if (!rawResponse) {
        throw new ServiceUnavailableException('Ollama вернула пустой ответ');
      }

      const { summaryMarkdown, tasks } = this.parseResponse(rawResponse);
      const processingTimeSec = (Date.now() - started) / 1000;

      this.logger.log(
        `Выжимка готова (${processingTimeSec.toFixed(1)} с, задач: ${tasks.length})`,
      );

      return {
        summaryMarkdown,
        tasks,
        model,
        processingTimeSec,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Ошибка Ollama: ${message}`);
      throw new ServiceUnavailableException(
        `Не удалось сгенерировать выжимку: ${message}`,
      );
    }
  }

  private buildPrompt(transcript: string): string {
    return `Ты — профессиональный секретарь. Проанализируй стенограмму созвона и сделай краткую, ёмкую выжимку (Minutes of Meeting) на русском языке.
Используй строго Markdown для форматирования.

Структура ответа:
# 📌 Выжимка созвона
**Главная тема встречи:** (одно-два предложения)

### 💬 Ключевые тезисы и обсуждения
* (Выдели важные мысли участников)

### 🤝 Принятые решения и договорённости
* (К каким решениям пришли)

### 📋 Список задач (Action Items)
* [ ] **Что сделать:** (описание) | **Ответственный:** (имя) | **Дедлайн:** (если озвучен)

После выжимки добавь блок JSON со списком задач (только явно озвученные action items):

\`\`\`json
{"tasks":[{"title":"описание задачи","assignee":"имя или null","dueDate":"YYYY-MM-DD или null"}]}
\`\`\`

Стенограмма для анализа:
${transcript}`;
  }

  private parseResponse(raw: string): {
    summaryMarkdown: string;
    tasks: SummaryTask[];
  } {
    let text = raw.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
    let tasks: SummaryTask[] = [];

    if (jsonMatch?.[1]) {
      try {
        const parsed = JSON.parse(jsonMatch[1]) as { tasks?: SummaryTask[] };
        tasks = (parsed.tasks ?? [])
          .filter((t) => t.title?.trim())
          .map((t) => ({
            title: t.title.trim(),
            assignee: t.assignee?.trim() || null,
            dueDate: t.dueDate?.trim() || null,
          }));
      } catch {
        this.logger.warn('Не удалось распарсить JSON с задачами из ответа LLM');
      }

      text = text.replace(/```json[\s\S]*?```/i, '').trim();
    }

    if (tasks.length === 0) {
      tasks = this.extractTasksFromMarkdown(text);
    }

    return { summaryMarkdown: text, tasks };
  }

  private extractTasksFromMarkdown(markdown: string): SummaryTask[] {
    const tasks: SummaryTask[] = [];
    const pattern =
      /\*\s*\[\s*\]\s*\*\*Что сделать:\*\*\s*(.+?)\s*\|\s*\*\*Ответственный:\*\*\s*([^|]+?)(?:\s*\|\s*\*\*Дедлайн:\*\*\s*(.+))?$/gim;

    for (const match of markdown.matchAll(pattern)) {
      tasks.push({
        title: match[1].trim(),
        assignee: match[2].trim() || null,
        dueDate: match[3]?.trim() || null,
      });
    }

    return tasks;
  }
}
