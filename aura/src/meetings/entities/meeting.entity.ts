export interface TranscriptSegment {
  id: string;
  meetingId: string;
  speaker: string;
  text: string;
  startedAt: string;
  durationSec: number;
  source: 'audioray';
}

export type MeetingStatus = 'starting' | 'active' | 'ended' | 'failed';

export interface Meeting {
  id: string;
  url: string;
  platform: string;
  botName: string;
  status: MeetingStatus;
  startedAt: string;
  endedAt?: string;
}
