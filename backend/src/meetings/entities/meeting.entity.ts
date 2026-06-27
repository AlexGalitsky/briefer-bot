import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';
import { TranscriptSegment } from 'src/transcripts/entities/transcript-segment.entity';

export type MeetingPlatform = 'yandex-telemost' | 'google-meet';
export type MeetingStatus =
  | 'pending'
  | 'starting'
  | 'active'
  | 'ended'
  | 'failed';

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 32 })
  platform: MeetingPlatform;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'bot_name', length: 100 })
  botName: string;

  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status: MeetingStatus;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null;

  @ManyToOne(() => User, (user) => user.meetings, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'created_by_id' })
  createdById: string;

  @OneToMany(() => TranscriptSegment, (segment) => segment.meeting)
  segments: TranscriptSegment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
