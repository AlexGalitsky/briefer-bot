import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from 'src/meetings/entities/meeting.entity';
import { MeetingTask } from './meeting-task.entity';

export type SummaryStatus =
  | 'pending'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'skipped';

@Entity('meeting_summaries')
export class MeetingSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: SummaryStatus;

  @Column({ name: 'content_markdown', type: 'text', nullable: true })
  contentMarkdown: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  model: string | null;

  @Column({ name: 'processing_time_sec', type: 'float', nullable: true })
  processingTimeSec: number | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @OneToMany(() => MeetingTask, (task) => task.summary)
  tasks: MeetingTask[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
