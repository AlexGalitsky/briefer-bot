import { Module } from '@nestjs/common';
import { AudiorayClient } from './audioray.client';
import { TranscriptAggregatorService } from './transcript-aggregator.service';

@Module({
  providers: [AudiorayClient, TranscriptAggregatorService],
  exports: [AudiorayClient, TranscriptAggregatorService],
})
export class TranscriptionModule {}
