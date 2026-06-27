import { Injectable } from '@nestjs/common';
import configuration from './configuration';

@Injectable()
export class AppConfigService {
  readonly values = configuration();
}
