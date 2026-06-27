export interface TranscriptEntry {
  timestamp: string;
  speaker: string;
  text: string;
  processingTimeSec: string;
}

export interface TranscriptStore {
  save(entry: TranscriptEntry): void;
}

export const TRANSCRIPT_STORE = Symbol('TRANSCRIPT_STORE');
