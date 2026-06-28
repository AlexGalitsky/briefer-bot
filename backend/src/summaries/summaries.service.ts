import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AudiorayClient } from 'src/audioray-client/audioray.client';
import { TranscriptsService } from 'src/transcripts/transcripts.service';
import { MeetingTask } from './entities/meeting-task.entity';
import {
  MeetingSummary,
  SummaryStatus,
} from './entities/meeting-summary.entity';

@Injectable()
export class SummariesService {
  private readonly logger = new Logger(SummariesService.name);
  private readonly inFlight = new Set<string>();

  constructor(
    @InjectRepository(MeetingSummary)
    private readonly summariesRepository: Repository<MeetingSummary>,
    @InjectRepository(MeetingTask)
    private readonly tasksRepository: Repository<MeetingTask>,
    private readonly transcriptsService: TranscriptsService,
    private readonly audiorayClient: AudiorayClient,
  ) {}

  getByMeeting(meetingId: string): Promise<MeetingSummary | null> {
    return this.summariesRepository
      .findOne({
        where: { meetingId },
        relations: { tasks: true },
      })
      .then((summary) => {
        if (summary?.tasks) {
          summary.tasks.sort((a, b) => a.sortOrder - b.sortOrder);
        }
        return summary;
      });
  }

  getTasksByMeeting(meetingId: string): Promise<MeetingTask[]> {
    return this.tasksRepository.find({
      where: { meetingId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  /** Вызывается из BullMQ processor или in-process fallback */
  async regenerateForMeeting(meetingId: string): Promise<void> {
    this.inFlight.delete(meetingId);
    await this.tasksRepository.delete({ meetingId });
    await this.summariesRepository.delete({ meetingId });
    await this.generateForMeeting(meetingId);
  }

  async generateForMeeting(meetingId: string): Promise<MeetingSummary> {
    if (this.inFlight.has(meetingId)) {
      const existing = await this.getByMeeting(meetingId);
      if (existing) return existing;
    }

    this.inFlight.add(meetingId);

    try {
      let summary = await this.getByMeeting(meetingId);

      if (summary?.status === 'ready' || summary?.status === 'processing') {
        return summary;
      }

      const segments = await this.transcriptsService.getSegments(meetingId);

      if (segments.length === 0) {
        return this.saveSummaryState(meetingId, summary, {
          status: 'skipped',
          errorMessage: 'Нет сегментов стенограммы для анализа',
        });
      }

      const fullText = segments
        .map(
          (s) =>
            `[${s.startedAt.toISOString()}] ${s.speaker}: ${s.text}`,
        )
        .join('\n');

      summary = await this.saveSummaryState(meetingId, summary, {
        status: 'processing',
        contentMarkdown: null,
        model: null,
        processingTimeSec: null,
        errorMessage: null,
      });

      try {
        const result = await this.audiorayClient.generateSummary(fullText);

        await this.tasksRepository.delete({ meetingId });

        const savedSummary = await this.saveSummaryState(meetingId, summary, {
          status: 'ready',
          contentMarkdown: result.summaryMarkdown,
          model: result.model,
          processingTimeSec: Number.parseFloat(result.processingTimeSec) || null,
          errorMessage: null,
        });

        if (result.tasks.length > 0) {
          const tasks = result.tasks.map((task, index) =>
            this.tasksRepository.create({
              meetingId,
              summaryId: savedSummary.id,
              title: task.title,
              assignee: task.assignee ?? null,
              dueDate: this.normalizeDueDate(task.dueDate),
              sortOrder: index,
            }),
          );
          await this.tasksRepository.save(tasks);
        }

        return (await this.getByMeeting(meetingId)) ?? savedSummary;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return this.saveSummaryState(meetingId, summary, {
          status: 'failed',
          errorMessage: message,
        });
      }
    } finally {
      this.inFlight.delete(meetingId);
    }
  }

  async updateTaskCompleted(
    meetingId: string,
    taskId: string,
    completed: boolean,
  ): Promise<MeetingTask> {
    const task = await this.tasksRepository.findOne({
      where: { id: taskId, meetingId },
    });

    if (!task) {
      throw new NotFoundException('Задача не найдена');
    }

    task.completed = completed;
    return this.tasksRepository.save(task);
  }

  private normalizeDueDate(value?: string | null): string | null {
    if (!value?.trim()) return null;
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    return null;
  }

  private async saveSummaryState(
    meetingId: string,
    existing: MeetingSummary | null,
    patch: Partial<MeetingSummary> & { status: SummaryStatus },
  ): Promise<MeetingSummary> {
    const entity =
      existing ??
      this.summariesRepository.create({
        meetingId,
        status: patch.status,
      });

    Object.assign(entity, patch);
    return this.summariesRepository.save(entity);
  }
}
