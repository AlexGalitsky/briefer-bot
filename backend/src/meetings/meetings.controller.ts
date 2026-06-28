import {
  Body,
  Controller,
  Get,
  Header,
  MessageEvent,
  Param,
  Patch,
  Post,
  Res,
  Sse,
  StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { SummariesService } from 'src/summaries/summaries.service';
import { SummaryExportService } from 'src/summaries/summary-export.service';
import { SummaryQueueService } from 'src/summaries/summary-queue.service';
import { User } from 'src/users/entities/user.entity';
import { TranscriptsService } from 'src/transcripts/transcripts.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptsService: TranscriptsService,
    private readonly summariesService: SummariesService,
    private readonly summaryQueueService: SummaryQueueService,
    private readonly summaryExportService: SummaryExportService,
  ) {}

  @Post()
  async create(@CurrentUser() user: User, @Body() dto: CreateMeetingDto) {
    const botName = dto.botName ?? 'Аура';
    const meeting = await this.meetingsService.createAndStart(
      user,
      dto.url,
      botName,
    );

    return {
      id: meeting.id,
      platform: meeting.platform,
      url: meeting.url,
      botName: meeting.botName,
      status: meeting.status,
      startedAt: meeting.startedAt,
      createdAt: meeting.createdAt,
    };
  }

  @Post(':id/stop')
  async stop(@CurrentUser() user: User, @Param('id') id: string) {
    const meeting = await this.meetingsService.stopMeeting(id, user.id);
    return {
      id: meeting.id,
      status: meeting.status,
      endedAt: meeting.endedAt,
    };
  }

  @Get()
  async list(@CurrentUser() user: User) {
    const meetings = await this.meetingsService.findByUser(user.id);
    return { meetings };
  }

  @Get(':id')
  async getOne(@CurrentUser() user: User, @Param('id') id: string) {
    const meeting = await this.meetingsService.findOwnedMeeting(id, user.id);
    const segmentCount = await this.transcriptsService.countByMeeting(id);
    return { meeting, segmentCount };
  }

  @Get(':id/transcript')
  async getTranscript(@CurrentUser() user: User, @Param('id') id: string) {
    await this.meetingsService.findOwnedMeeting(id, user.id);
    const segments = await this.transcriptsService.getSegments(id);

    return {
      meetingId: id,
      segments,
      fullText: segments
        .map(
          (s) =>
            `[${s.startedAt.toISOString()}] ${s.speaker}: ${s.text}`,
        )
        .join('\n'),
    };
  }

  @Get(':id/summary')
  async getSummary(@CurrentUser() user: User, @Param('id') id: string) {
    await this.meetingsService.findOwnedMeeting(id, user.id);
    const summary = await this.summariesService.getByMeeting(id);

    return {
      meetingId: id,
      summary: summary
        ? {
            id: summary.id,
            status: summary.status,
            contentMarkdown: summary.contentMarkdown,
            model: summary.model,
            processingTimeSec: summary.processingTimeSec,
            errorMessage: summary.errorMessage,
            createdAt: summary.createdAt,
            updatedAt: summary.updatedAt,
          }
        : null,
    };
  }

  @Post(':id/summary/regenerate')
  async regenerateSummary(@CurrentUser() user: User, @Param('id') id: string) {
    await this.meetingsService.findOwnedMeeting(id, user.id);
    await this.summaryQueueService.enqueueGenerate(id, true);

    return {
      meetingId: id,
      message: 'Генерация выжимки поставлена в очередь',
    };
  }

  @Get(':id/summary/export/markdown')
  @Header('Content-Type', 'text/markdown; charset=utf-8')
  async exportSummaryMarkdown(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const meeting = await this.meetingsService.findOwnedMeeting(id, user.id);
    const summary = await this.summaryExportService.getReadySummary(id);
    const exported = await this.summaryExportService.buildMarkdownExport(
      meeting,
      summary,
    );

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${exported.filename}"`,
    );

    return exported.content;
  }

  @Get(':id/summary/export/pdf')
  async exportSummaryPdf(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<StreamableFile> {
    const meeting = await this.meetingsService.findOwnedMeeting(id, user.id);
    const summary = await this.summaryExportService.getReadySummary(id);
    const exported = await this.summaryExportService.buildPdfBuffer(
      meeting,
      summary,
    );

    return new StreamableFile(exported.buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${exported.filename}"`,
    });
  }

  @Get(':id/tasks')
  async getTasks(@CurrentUser() user: User, @Param('id') id: string) {
    await this.meetingsService.findOwnedMeeting(id, user.id);
    const tasks = await this.summariesService.getTasksByMeeting(id);

    return {
      meetingId: id,
      tasks,
    };
  }

  @Patch(':id/tasks/:taskId')
  async updateTask(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('taskId') taskId: string,
    @Body() body: { completed: boolean },
  ) {
    await this.meetingsService.findOwnedMeeting(id, user.id);
    const task = await this.summariesService.updateTaskCompleted(
      id,
      taskId,
      body.completed,
    );

    return { task };
  }

  @Sse(':id/transcript/stream')
  async streamTranscript(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<Observable<MessageEvent>> {
    await this.meetingsService.findOwnedMeeting(id, user.id);
    return this.transcriptsService.watchSegments(id).pipe(
      map((segment) => ({
        data: segment,
      })),
    );
  }
}
