import { config as loadEnv } from 'dotenv';
import { DataSource } from 'typeorm';
import { OtpChallenge } from './auth/entities/otp-challenge.entity';
import { Meeting } from './meetings/entities/meeting.entity';
import { TranscriptSegment } from './transcripts/entities/transcript-segment.entity';
import { User } from './users/entities/user.entity';

loadEnv();

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'briefer',
  entities: [User, Meeting, TranscriptSegment, OtpChallenge],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
});
