import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Public } from 'src/common/decorators/public.decorator';
import { InternalApiGuard } from 'src/common/guards/auth.guards';
import { MeetingsService } from 'src/meetings/meetings.service';
import { TranscriptsService } from 'src/transcripts/transcripts.service';
import {
  CreateTranscriptSegmentDto,
  UpdateMeetingStatusDto,
} from './dto/internal.dto';

@Controller('internal')
@Public()
@UseGuards(InternalApiGuard)
export class InternalController {
  constructor(
    private readonly transcriptsService: TranscriptsService,
    private readonly meetingsService: MeetingsService,
  ) {}

  @Post('transcript-segments')
  async createSegment(@Body() dto: CreateTranscriptSegmentDto) {
    const segment = await this.transcriptsService.addSegment({
      meetingId: dto.meetingId,
      speaker: dto.speaker,
      text: dto.text,
      startedAt: new Date(dto.startedAt),
      durationSec: dto.durationSec,
      source: dto.source,
    });

    return { id: segment.id };
  }

  @Patch('meetings/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingStatusDto,
  ) {
    await this.meetingsService.updateStatus(id, dto.status);
    return { success: true };
  }
}
