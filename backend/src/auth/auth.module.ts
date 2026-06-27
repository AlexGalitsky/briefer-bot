import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfigService } from 'src/config/app-config.service';
import { UsersModule } from 'src/users/users.module';
import { OtpChallenge } from './entities/otp-challenge.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CryptoService } from './crypto.service';
import { JwtStrategy } from './jwt.strategy';
import { PhoneOtpService } from './phone-otp.service';
import { TotpService } from './totp.service';
import { ConsoleSmsGateway } from './sms/console-sms.gateway';
import { SMS_GATEWAY } from './sms/sms-gateway.interface';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.values.jwt.secret,
        signOptions: { expiresIn: config.values.jwt.expiresIn as `${number}d` },
      }),
    }),
    TypeOrmModule.forFeature([OtpChallenge]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PhoneOtpService,
    TotpService,
    CryptoService,
    JwtStrategy,
    { provide: SMS_GATEWAY, useClass: ConsoleSmsGateway },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
