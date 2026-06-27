import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from 'src/meetings/entities/meeting.entity';
import { MeetingSummary } from './meeting-summary.entity';

@Entity('meeting_tasks')
export class MeetingTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting;

  @Column({ name: 'meeting_id' })
  meetingId: string;

  @ManyToOne(() => MeetingSummary, (summary) => summary.tasks, {
    onDelete: 'CASCADE',
    nullable: true,
  })
  @JoinColumn({ name: 'summary_id' })
  summary: MeetingSummary | null;

  @Column({ name: 'summary_id', nullable: true })
  summaryId: string | null;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  assignee: string | null;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ default: false })
  completed: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
