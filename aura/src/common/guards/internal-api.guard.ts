import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppConfigService } from 'src/config/app-config.service';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class InternalApiGuard implements CanActivate {
  constructor(
    private readonly config: AppConfigService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const token = request.headers['x-internal-token'];

    if (!token || token !== this.config.values.internal.apiToken) {
      throw new UnauthorizedException('Invalid internal API token');
    }

    return true;
  }
}
