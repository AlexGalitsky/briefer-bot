import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type OtpPurpose = 'register' | 'login';

@Entity('otp_challenges')
@Index(['phone', 'purpose'])
export class OtpChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ name: 'code_hash', length: 128 })
  codeHash: string;

  @Column({ type: 'varchar', length: 16 })
  purpose: OtpPurpose;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @Column({ name: 'consumed_at', type: 'timestamptz', nullable: true })
  consumedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
