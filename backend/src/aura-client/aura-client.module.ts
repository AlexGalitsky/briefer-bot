import { Module } from '@nestjs/common';
import { AuraClient } from './aura.client';

@Module({
  providers: [AuraClient],
  exports: [AuraClient],
})
export class AuraClientModule {}
