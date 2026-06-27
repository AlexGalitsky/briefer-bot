import { Module } from '@nestjs/common';
import { BackendClient } from './backend.client';

@Module({
  providers: [BackendClient],
  exports: [BackendClient],
})
export class BackendModule {}
