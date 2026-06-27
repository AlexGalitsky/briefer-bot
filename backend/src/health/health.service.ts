import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuraClient } from 'src/aura-client/aura.client';

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly auraClient: AuraClient,
  ) {}

  async check() {
    let db = false;
    try {
      await this.dataSource.query('SELECT 1');
      db = true;
    } catch {
      db = false;
    }

    const aura = await this.auraClient.ping();

    return {
      status: db && aura ? 'ok' : 'degraded',
      checks: { database: db, aura },
    };
  }
}
