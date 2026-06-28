export const SUMMARY_QUEUE_NAME = 'summary';

export type SummaryJobName = 'generate';

export interface SummaryJobPayload {
  meetingId: string;
  regenerate?: boolean;
}
