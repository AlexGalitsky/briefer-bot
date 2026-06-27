import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meeting } from 'src/meetings/entities/meeting.entity';

export type UserRole = 'admin' | 'user';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ type: 'varchar', length: 16, default: 'user' })
  role: UserRole;

  /** AES-encrypted TOTP secret (authenticator app), null until enrolled */
  @Column({ name: 'totp_secret_enc', type: 'text', nullable: true })
  totpSecretEnc: string | null;

  @Column({ name: 'totp_enabled', default: false })
  totpEnabled: boolean;

  @OneToMany(() => Meeting, (meeting) => meeting.createdBy)
  meetings: Meeting[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
