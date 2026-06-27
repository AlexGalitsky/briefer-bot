import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTranscriptSegmentDto {
  @IsUUID()
  meetingId: string;

  @IsString()
  @MaxLength(200)
  speaker: string;

  @IsString()
  text: string;

  @IsDateString()
  startedAt: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  durationSec?: number;

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateMeetingStatusDto {
  @IsIn(['pending', 'starting', 'active', 'ended', 'failed'])
  status: 'pending' | 'starting' | 'active' | 'ended' | 'failed';
}
