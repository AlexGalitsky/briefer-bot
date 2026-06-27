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
  private activeMeetingId: string | null = null;

  registerMeeting(
    meetingId: string,
    url: string,
    botName: string,
    platform: string,
  ): Meeting {
    if (this.activeMeetingId) {
      throw new BadRequestException(
        'Уже есть активная встреча. Остановите бота перед запуском новой.',
      );
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
    this.activeMeetingId = meeting.id;
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

  getActiveMeeting(): Meeting | null {
    if (!this.activeMeetingId) return null;
    return this.meetings.get(this.activeMeetingId) ?? null;
  }

  getActiveMeetingId(): string | null {
    return this.activeMeetingId;
  }

  setStatus(meetingId: string, status: MeetingStatus): void {
    const meeting = this.getMeeting(meetingId);
    meeting.status = status;

    if (status === 'ended' || status === 'failed') {
      meeting.endedAt = new Date().toISOString();
      if (this.activeMeetingId === meetingId) {
        this.activeMeetingId = null;
      }
    }

    this.logger.log(`Встреча ${meetingId}: статус → ${status}`);
  }

  endActiveMeeting(): Meeting | null {
    if (!this.activeMeetingId) return null;

    const meeting = this.getMeeting(this.activeMeetingId);
    this.setStatus(meeting.id, 'ended');
    return meeting;
  }

  detectPlatform(url: string): string {
    if (url.includes('telemost.yandex')) return 'yandex-telemost';
    if (url.includes('meet.google.com')) return 'google-meet';
    throw new BadRequestException(
      'Указанная платформа не поддерживается ботом.',
    );
  }
}
