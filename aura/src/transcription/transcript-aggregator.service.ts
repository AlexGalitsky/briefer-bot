import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AppConfigService } from 'src/config/app-config.service';
import { TranscriptSegment } from 'src/meetings/entities/meeting.entity';

@Injectable()
export class TranscriptAggregatorService implements OnModuleInit {
  private readonly logger = new Logger(TranscriptAggregatorService.name);
  private readonly transcriptsFolder: string;
  private readonly segmentsByMeeting = new Map<string, TranscriptSegment[]>();
  private readonly segmentSubject = new Subject<TranscriptSegment>();

  constructor(private readonly config: AppConfigService) {
    this.transcriptsFolder = path.join(
      process.cwd(),
      this.config.values.paths.transcripts,
    );
  }

  onModuleInit() {
    if (!fs.existsSync(this.transcriptsFolder)) {
      fs.mkdirSync(this.transcriptsFolder, { recursive: true });
      this.logger.log(`Папка стенограмм: ${this.transcriptsFolder}`);
    }
  }

  addSegment(
    meetingId: string,
    data: Omit<TranscriptSegment, 'id' | 'meetingId' | 'source'>,
  ): TranscriptSegment {
    const segment: TranscriptSegment = {
      id: randomUUID(),
      meetingId,
      source: 'audioray',
      ...data,
    };

    const segments = this.segmentsByMeeting.get(meetingId) ?? [];
    segments.push(segment);
    this.segmentsByMeeting.set(meetingId, segments);

    const jsonlPath = path.join(this.transcriptsFolder, `${meetingId}.jsonl`);
    fs.appendFileSync(jsonlPath, `${JSON.stringify(segment)}\n`);

    this.segmentSubject.next(segment);
    this.logger.log(
      `[Стенограмма] ${meetingId}: ${segment.speaker} — "${segment.text}"`,
    );

    return segment;
  }

  getSegments(meetingId: string): TranscriptSegment[] {
    return [...(this.segmentsByMeeting.get(meetingId) ?? [])];
  }

  watchSegments(meetingId: string): Observable<TranscriptSegment> {
    return this.segmentSubject.pipe(
      filter((segment) => segment.meetingId === meetingId),
    );
  }

  loadMeetingFromDisk(meetingId: string): TranscriptSegment[] {
    if (this.segmentsByMeeting.has(meetingId)) {
      return this.getSegments(meetingId);
    }

    const jsonlPath = path.join(this.transcriptsFolder, `${meetingId}.jsonl`);
    if (!fs.existsSync(jsonlPath)) {
      return [];
    }

    const lines = fs
      .readFileSync(jsonlPath, 'utf8')
      .split('\n')
      .filter((line) => line.trim());

    const segments = lines.map(
      (line) => JSON.parse(line) as TranscriptSegment,
    );
    this.segmentsByMeeting.set(meetingId, segments);
    return segments;
  }
}
