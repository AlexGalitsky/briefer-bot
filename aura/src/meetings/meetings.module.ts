import { Module } from '@nestjs/common';
import { AudiorayService } from 'src/services/audioray.service';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';
import { TranscriptAggregatorService } from './transcript-aggregator.service';

@Module({
  controllers: [MeetingsController],
  providers: [MeetingsService, TranscriptAggregatorService, AudiorayService],
  exports: [MeetingsService, TranscriptAggregatorService, AudiorayService],
})
export class MeetingsModule {}
