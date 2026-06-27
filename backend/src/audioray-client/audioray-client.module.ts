import { Module } from '@nestjs/common';
import { AppConfigModule } from 'src/config/app-config.module';
import { AudiorayClient } from './audioray.client';

@Module({
  imports: [AppConfigModule],
  providers: [AudiorayClient],
  exports: [AudiorayClient],
})
export class AudiorayClientModule {}
