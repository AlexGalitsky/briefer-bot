import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hash, compare } from 'bcryptjs';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { AppConfigService } from 'src/config/app-config.service';
import { OtpChallenge, OtpPurpose } from './entities/otp-challenge.entity';
import { SMS_GATEWAY, type SmsGateway } from './sms/sms-gateway.interface';
import { Inject } from '@nestjs/common';

const MAX_OTP_ATTEMPTS = 5;

@Injectable()
export class PhoneOtpService {
  constructor(
    @InjectRepository(OtpChallenge)
    private readonly otpRepository: Repository<OtpChallenge>,
    private readonly config: AppConfigService,
    @Inject(SMS_GATEWAY) private readonly smsGateway: SmsGateway,
  ) {}

  async sendOtp(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<{ challengeId: string; expiresInSec: number; devCode?: string }> {
    const { otpLength, otpTtlSec } = this.config.values.auth;
    const code = this.generateNumericCode(otpLength);
    const codeHash = await hash(code, 10);
    const expiresAt = new Date(Date.now() + otpTtlSec * 1000);

    await this.otpRepository.update(
      { phone, purpose, consumedAt: IsNull() },
      { consumedAt: new Date() },
    );

    const challenge = this.otpRepository.create({
      phone,
      purpose,
      codeHash,
      expiresAt,
    });
    const saved = await this.otpRepository.save(challenge);

    await this.smsGateway.send({
      phone,
      message: `Код подтверждения Briefer: ${code}. Действует ${Math.floor(otpTtlSec / 60)} мин.`,
    });

    const result: {
      challengeId: string;
      expiresInSec: number;
      devCode?: string;
    } = {
      challengeId: saved.id,
      expiresInSec: otpTtlSec,
    };

    if (this.config.values.auth.devExposeOtp) {
      result.devCode = code;
    }

    return result;
  }

  async verifyOtp(
    phone: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<void> {
    const challenge = await this.otpRepository.findOne({
      where: {
        phone,
        purpose,
        consumedAt: IsNull(),
        expiresAt: MoreThan(new Date()),
      },
      order: { createdAt: 'DESC' },
    });

    if (!challenge) {
      throw new UnauthorizedException('Код истёк или не запрашивался');
    }

    if (challenge.attempts >= MAX_OTP_ATTEMPTS) {
      throw new UnauthorizedException('Превышено число попыток');
    }

    const valid = await compare(code, challenge.codeHash);
    challenge.attempts += 1;

    if (!valid) {
      await this.otpRepository.save(challenge);
      throw new UnauthorizedException('Неверный код');
    }

    challenge.consumedAt = new Date();
    await this.otpRepository.save(challenge);
  }

  normalizePhone(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      throw new BadRequestException('Некорректный номер телефона');
    }

    if (digits.length === 11 && digits.startsWith('8')) {
      return `+7${digits.slice(1)}`;
    }
    if (digits.length === 11 && digits.startsWith('7')) {
      return `+${digits}`;
    }
    if (digits.length === 10) {
      return `+7${digits}`;
    }

    return `+${digits}`;
  }

  private generateNumericCode(length: number): string {
    let code = '';
    for (let i = 0; i < length; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    return code;
  }
}
