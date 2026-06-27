import { Injectable } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import { AppConfigService } from 'src/config/app-config.service';
import { CryptoService } from './crypto.service';

@Injectable()
export class TotpService {
  constructor(
    private readonly config: AppConfigService,
    private readonly crypto: CryptoService,
  ) {}

  generateSecret(): string {
    return generateSecret();
  }

  buildOtpauthUrl(phone: string, secret: string): string {
    return generateURI({
      issuer: this.config.values.auth.totpIssuer,
      label: phone,
      secret,
    });
  }

  async verifyCode(secret: string, code: string): Promise<boolean> {
    const result = await verify({ secret, token: code });
    return result.valid;
  }

  encryptSecret(secret: string): string {
    return this.crypto.encrypt(secret);
  }

  decryptSecret(encrypted: string): string {
    return this.crypto.decrypt(encrypted);
  }

  async verifyUserCode(encryptedSecret: string, code: string): Promise<boolean> {
    const secret = this.decryptSecret(encryptedSecret);
    return this.verifyCode(secret, code);
  }
}
