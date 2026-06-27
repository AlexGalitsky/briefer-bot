import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { User } from 'src/users/entities/user.entity';
import { PhoneOtpService } from './phone-otp.service';
import { TotpService } from './totp.service';

export interface JwtPayload {
  sub: string;
  phone: string;
  role: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly phoneOtpService: PhoneOtpService,
    private readonly totpService: TotpService,
    private readonly jwtService: JwtService,
  ) {}

  async sendOtp(phone: string, purpose: 'register' | 'login') {
    const normalized = this.phoneOtpService.normalizePhone(phone);
    const existing = await this.usersService.findByPhone(normalized);

    if (purpose === 'register' && existing) {
      throw new ConflictException('Пользователь с этим телефоном уже зарегистрирован');
    }

    if (purpose === 'login' && !existing) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    const result = await this.phoneOtpService.sendOtp(normalized, purpose);
    return { phone: normalized, ...result };
  }

  async verifyOtpAndAuthenticate(
    phone: string,
    code: string,
    purpose: 'register' | 'login',
    totpCode?: string,
  ) {
    const normalized = this.phoneOtpService.normalizePhone(phone);
    await this.phoneOtpService.verifyOtp(normalized, code, purpose);

    let user: User;
    if (purpose === 'register') {
      const existing = await this.usersService.findByPhone(normalized);
      if (existing) {
        throw new ConflictException('Пользователь уже существует');
      }
      user = await this.usersService.createUser(normalized);
    } else {
      const found = await this.usersService.findByPhone(normalized);
      if (!found) {
        throw new UnauthorizedException('Пользователь не найден');
      }
      user = found;
    }

    if (user.totpEnabled) {
      if (!totpCode) {
        return {
          requiresTotp: true as const,
          phone: normalized,
          message: 'Требуется код из приложения-аутентификатора',
        };
      }

      if (
        !user.totpSecretEnc ||
        !(await this.totpService.verifyUserCode(user.totpSecretEnc, totpCode))
      ) {
        throw new UnauthorizedException('Неверный TOTP-код');
      }
    }

    return {
      requiresTotp: false as const,
      accessToken: await this.signToken(user),
      user: this.toPublicUser(user),
    };
  }

  async beginTotpEnrollment(userId: string, phone: string) {
    const secret = this.totpService.generateSecret();
    const encrypted = this.totpService.encryptSecret(secret);
    await this.usersService.setPendingTotpSecret(userId, encrypted);

    return {
      otpauthUrl: this.totpService.buildOtpauthUrl(phone, secret),
      message:
        'Отсканируйте QR в приложении-аутентификаторе и подтвердите кодом',
    };
  }

  async confirmTotpEnrollment(userId: string, code: string) {
    const user = await this.usersService.findById(userId);
    if (!user?.totpSecretEnc) {
      throw new UnauthorizedException('Сначала запросите настройку TOTP');
    }

    if (!(await this.totpService.verifyUserCode(user.totpSecretEnc, code))) {
      throw new UnauthorizedException('Неверный TOTP-код');
    }

    await this.usersService.saveTotpSecret(userId, user.totpSecretEnc);
    return { totpEnabled: true };
  }

  async disableTotp(userId: string) {
    await this.usersService.disableTotp(userId);
    return { totpEnabled: false };
  }

  async signToken(user: User): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      phone: user.phone,
      role: user.role,
    };
    return this.jwtService.signAsync(payload);
  }

  toPublicUser(user: User) {
    return {
      id: user.id,
      phone: user.phone,
      role: user.role,
      totpEnabled: user.totpEnabled,
      createdAt: user.createdAt,
    };
  }
}
