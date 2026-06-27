import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Meeting } from 'src/meetings/entities/meeting.entity';

@Entity('transcript_segments')
export class TranscriptSegment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, (meeting) => meeting.segments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @Column({ length: 200 })
  speaker: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt: Date;

  @Column({ name: 'duration_sec', type: 'float', default: 0 })
  durationSec: number;

  @Column({ length: 32, default: 'audioray' })
  source: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
