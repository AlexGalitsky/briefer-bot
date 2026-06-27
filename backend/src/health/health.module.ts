import { Module } from '@nestjs/common';
import { AuraClientModule } from 'src/aura-client/aura-client.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [AuraClientModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
