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
