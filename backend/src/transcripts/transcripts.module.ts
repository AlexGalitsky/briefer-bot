import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TranscriptSegment } from './entities/transcript-segment.entity';
import { TranscriptsService } from './transcripts.service';

@Module({
  imports: [TypeOrmModule.forFeature([TranscriptSegment])],
  providers: [TranscriptsService],
  exports: [TranscriptsService, TypeOrmModule],
})
export class TranscriptsModule {}
