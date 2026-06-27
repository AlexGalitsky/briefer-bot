import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Observable, Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import { Repository } from 'typeorm';
import { TranscriptSegment } from './entities/transcript-segment.entity';

export interface CreateSegmentInput {
  meetingId: string;
  speaker: string;
  text: string;
  startedAt: Date;
  durationSec?: number;
  source?: string;
}

@Injectable()
export class TranscriptsService {
  private readonly segmentSubject = new Subject<TranscriptSegment>();

  constructor(
    @InjectRepository(TranscriptSegment)
    private readonly segmentsRepository: Repository<TranscriptSegment>,
  ) {}

  async addSegment(input: CreateSegmentInput): Promise<TranscriptSegment> {
    const segment = this.segmentsRepository.create({
      meetingId: input.meetingId,
      speaker: input.speaker,
      text: input.text,
      startedAt: input.startedAt,
      durationSec: input.durationSec ?? 0,
      source: input.source ?? 'audioray',
    });

    const saved = await this.segmentsRepository.save(segment);
    this.segmentSubject.next(saved);
    return saved;
  }

  getSegments(meetingId: string): Promise<TranscriptSegment[]> {
    return this.segmentsRepository.find({
      where: { meetingId },
      order: { startedAt: 'ASC' },
    });
  }

  countByMeeting(meetingId: string): Promise<number> {
    return this.segmentsRepository.count({ where: { meetingId } });
  }

  watchSegments(meetingId: string): Observable<TranscriptSegment> {
    return this.segmentSubject.pipe(
      filter((segment) => segment.meetingId === meetingId),
    );
  }
}
