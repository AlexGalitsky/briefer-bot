import { Module } from '@nestjs/common';
import { MeetingsService } from './meetings.service';

@Module({
  providers: [MeetingsService],
  exports: [MeetingsService],
})
export class MeetingsModule {}
