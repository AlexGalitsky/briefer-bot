import {
  Controller,
  Get,
  MessageEvent,
  NotFoundException,
  Param,
  Sse,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { MeetingsService } from './meetings.service';
import { TranscriptAggregatorService } from './transcript-aggregator.service';

@Controller('meetings')
export class MeetingsController {
  constructor(
    private readonly meetingsService: MeetingsService,
    private readonly transcriptAggregator: TranscriptAggregatorService,
  ) {}

  @Get('active')
  getActive() {
    const meeting = this.meetingsService.getActiveMeeting();
    if (!meeting) {
      return { active: false, meeting: null };
    }

    return {
      active: true,
      meeting,
      segmentCount: this.transcriptAggregator.getSegments(meeting.id).length,
    };
  }

  @Get(':id')
  getMeeting(@Param('id') id: string) {
    const meeting = this.meetingsService.getMeeting(id);
    const segments = this.transcriptAggregator.loadMeetingFromDisk(id);

    return {
      meeting,
      segmentCount: segments.length,
    };
  }

  @Get(':id/transcript')
  getTranscript(@Param('id') id: string) {
    this.meetingsService.getMeeting(id);
    const segments = this.transcriptAggregator.loadMeetingFromDisk(id);

    return {
      meetingId: id,
      segments,
      fullText: segments
        .map((s) => `[${s.startedAt}] ${s.speaker}: ${s.text}`)
        .join('\n'),
    };
  }

  @Sse(':id/transcript/stream')
  streamTranscript(@Param('id') id: string): Observable<MessageEvent> {
    try {
      this.meetingsService.getMeeting(id);
    } catch {
      throw new NotFoundException(`Встреча ${id} не найдена`);
    }

    return this.transcriptAggregator.watchSegments(id).pipe(
      map((segment) => ({
        data: segment,
      })),
    );
  }
}
