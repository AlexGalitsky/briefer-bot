import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Body,
  Sse,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { TranscriptsService } from 'src/transcripts/transcripts.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingsService } from './meetings.service';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptsService: TranscriptsService,
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
