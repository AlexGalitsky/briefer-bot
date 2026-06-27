import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuraClientModule } from 'src/aura-client/aura-client.module';
import { TranscriptsModule } from 'src/transcripts/transcripts.module';
import { Meeting } from './entities/meeting.entity';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from './meetings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meeting]),
    AuraClientModule,
    TranscriptsModule,
  ],
  controllers: [MeetingsController],
  providers: [MeetingsService],
  exports: [MeetingsService, TypeOrmModule],
})
export class MeetingsModule {}
