import { Module } from '@nestjs/common';
import { BackendModule } from 'src/backend/backend.module';
import { AudiorayClient } from './audioray.client';

@Module({
  imports: [BackendModule],
  providers: [AudiorayClient],
  exports: [AudiorayClient],
})
export class TranscriptionModule {}
