import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Meeting, MeetingStatus } from './entities/meeting.entity';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);
  private readonly meetings = new Map<string, Meeting>();

  registerMeeting(
    meetingId: string,
    url: string,
    botName: string,
    platform: string,
  ): Meeting {
    if (this.meetings.has(meetingId)) {
      throw new BadRequestException(`Встреча ${meetingId} уже зарегистрирована`);
    }

    const meeting: Meeting = {
      id: meetingId,
      url,
      platform,
      botName,
      status: 'starting',
      startedAt: new Date().toISOString(),
    };

    this.meetings.set(meeting.id, meeting);
    this.logger.log(`Зарегистрирована встреча ${meeting.id} (${platform})`);

    return meeting;
  }

  getMeeting(meetingId: string): Meeting {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      throw new NotFoundException(`Встреча ${meetingId} не найдена`);
    }
    return meeting;
  }

  getActiveMeetings(): Meeting[] {
    return [...this.meetings.values()].filter(
      (m) => m.status === 'starting' || m.status === 'active',
    );
  }

  getActiveMeetingIds(): string[] {
    return this.getActiveMeetings().map((m) => m.id);
  }

  /** @deprecated Используйте getActiveMeetings() */
  getActiveMeeting(): Meeting | null {
    const active = this.getActiveMeetings();
    return active[0] ?? null;
  }

  /** @deprecated Используйте getActiveMeetingIds() */
  getActiveMeetingId(): string | null {
    return this.getActiveMeeting()?.id ?? null;
  }

  setStatus(meetingId: string, status: MeetingStatus): void {
    const meeting = this.getMeeting(meetingId);
    meeting.status = status;

    if (status === 'ended' || status === 'failed') {
      meeting.endedAt = new Date().toISOString();
    }

    this.logger.log(`Встреча ${meetingId}: статус → ${status}`);
  }

  endMeeting(meetingId: string): Meeting | null {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) return null;

    this.setStatus(meeting.id, 'ended');
    return meeting;
  }

  /** @deprecated Используйте endMeeting(meetingId) */
  endActiveMeeting(): Meeting | null {
    const active = this.getActiveMeetings();
    if (active.length === 0) return null;
    return this.endMeeting(active[0].id);
  }

  detectPlatform(url: string): string {
    if (url.includes('telemost.yandex')) return 'yandex-telemost';
    if (url.includes('meet.google.com')) return 'google-meet';
    throw new BadRequestException(
      'Указанная платформа не поддерживается ботом.',
    );
  }
}
