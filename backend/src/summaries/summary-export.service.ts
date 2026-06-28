import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces';
import { Meeting } from 'src/meetings/entities/meeting.entity';
import { MeetingSummary } from './entities/meeting-summary.entity';
import { MeetingTask } from './entities/meeting-task.entity';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/build/pdfmake');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfFonts = require('pdfmake/build/vfs_fonts');

PdfPrinter.vfs = pdfFonts.pdfMake?.vfs ?? pdfFonts.vfs;

const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

@Injectable()
export class SummaryExportService {
  constructor(
    @InjectRepository(MeetingSummary)
    private readonly summariesRepository: Repository<MeetingSummary>,
    @InjectRepository(MeetingTask)
    private readonly tasksRepository: Repository<MeetingTask>,
  ) {}

  async buildMarkdownExport(
    meeting: Meeting,
    summary: MeetingSummary,
  ): Promise<{ filename: string; content: string }> {
    if (!summary.contentMarkdown) {
      throw new BadRequestException('Выжимка ещё не готова');
    }

    const tasks = await this.tasksRepository.find({
      where: { meetingId: meeting.id },
      order: { sortOrder: 'ASC' },
    });

    const header = [
      `# Выжимка встречи`,
      ``,
      `- **Платформа:** ${meeting.platform}`,
      `- **Бот:** ${meeting.botName}`,
      `- **URL:** ${meeting.url}`,
      `- **Дата:** ${(meeting.endedAt ?? meeting.createdAt).toISOString()}`,
      summary.model ? `- **Модель:** ${summary.model}` : null,
      ``,
      `---`,
      ``,
    ]
      .filter(Boolean)
      .join('\n');

    let tasksBlock = '';
    if (tasks.length > 0) {
      tasksBlock =
        `\n\n---\n\n## Задачи (из БД)\n\n` +
        tasks
          .map((t) => {
            const check = t.completed ? 'x' : ' ';
            const parts = [`- [${check}] ${t.title}`];
            if (t.assignee) parts.push(`**Ответственный:** ${t.assignee}`);
            if (t.dueDate) parts.push(`**Дедлайн:** ${t.dueDate}`);
            return parts.join(' | ');
          })
          .join('\n');
    }

    const filename = `summary-${meeting.id.slice(0, 8)}.md`;

    return {
      filename,
      content: header + summary.contentMarkdown + tasksBlock,
    };
  }

  async buildPdfBuffer(
    meeting: Meeting,
    summary: MeetingSummary,
  ): Promise<{ filename: string; buffer: Buffer }> {
    if (!summary.contentMarkdown) {
      throw new BadRequestException('Выжимка ещё не готова');
    }

    const tasks = await this.tasksRepository.find({
      where: { meetingId: meeting.id },
      order: { sortOrder: 'ASC' },
    });

    const content: Content[] = [
      { text: 'Выжимка встречи', style: 'header' },
      {
        text: [
          `Платформа: ${meeting.platform}\n`,
          `Бот: ${meeting.botName}\n`,
          `Дата: ${(meeting.endedAt ?? meeting.createdAt).toLocaleString('ru-RU')}\n`,
          summary.model ? `Модель: ${summary.model}` : '',
        ].join(''),
        style: 'meta',
        margin: [0, 0, 0, 12] as [number, number, number, number],
      },
      ...this.markdownToPdfContent(summary.contentMarkdown),
    ];

    if (tasks.length > 0) {
      content.push(
        { text: 'Задачи', style: 'subheader', margin: [0, 16, 0, 8] },
        {
          ul: tasks.map((t) => {
            const prefix = t.completed ? '✓ ' : '○ ';
            let line = `${prefix}${t.title}`;
            if (t.assignee) line += ` (${t.assignee})`;
            if (t.dueDate) line += ` — до ${t.dueDate}`;
            return line;
          }),
        },
      );
    }

    const docDefinition: TDocumentDefinitions = {
      content,
      defaultStyle: { font: 'Roboto', fontSize: 11 },
      styles: {
        header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, bold: true },
        meta: { fontSize: 9, color: '#444444' },
        h1: { fontSize: 16, bold: true, margin: [0, 12, 0, 6] },
        h3: { fontSize: 13, bold: true, margin: [0, 10, 0, 4] },
        bullet: { margin: [0, 2, 0, 2] },
        paragraph: { margin: [0, 2, 0, 4] },
      },
    };

    const printer = new PdfPrinter(fonts);
    const pdfDoc = printer.createPdfKitDocument(docDefinition);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      pdfDoc.on('error', reject);
      pdfDoc.end();
    });

    return {
      filename: `summary-${meeting.id.slice(0, 8)}.pdf`,
      buffer,
    };
  }

  async getReadySummary(meetingId: string): Promise<MeetingSummary> {
    const summary = await this.summariesRepository.findOne({
      where: { meetingId },
    });

    if (!summary) {
      throw new NotFoundException('Выжимка не найдена');
    }

    if (summary.status !== 'ready' || !summary.contentMarkdown) {
      throw new BadRequestException('Выжимка ещё не готова для экспорта');
    }

    return summary;
  }

  private markdownToPdfContent(markdown: string): Content[] {
    const lines = markdown.split('\n');
    const result: Content[] = [];

    for (const line of lines) {
      const trimmed = line.trimEnd();
      if (!trimmed) continue;

      if (trimmed.startsWith('# ')) {
        result.push({ text: trimmed.slice(2), style: 'h1' });
      } else if (trimmed.startsWith('### ')) {
        result.push({ text: trimmed.slice(4), style: 'h3' });
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        result.push({ text: trimmed.slice(2), style: 'bullet' });
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        result.push({
          text: trimmed.slice(2, -2),
          bold: true,
          style: 'paragraph',
        });
      } else {
        result.push({ text: trimmed, style: 'paragraph' });
      }
    }

    return result;
  }
}
