import { IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+?[0-9\s()-]{10,18}$/, {
    message: 'phone must be a valid phone number',
  })
  phone: string;

  @IsIn(['register', 'login'])
  purpose: 'register' | 'login';
}

export class VerifyOtpDto {
  @IsString()
  phone: string;

  @IsString()
  @Length(4, 8)
  code: string;

  @IsIn(['register', 'login'])
  purpose: 'register' | 'login';

  /** Required when user has TOTP enabled (authenticator app) */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totpCode?: string;
}

export class ConfirmTotpDto {
  @IsString()
  @Length(6, 6)
  code: string;
}
