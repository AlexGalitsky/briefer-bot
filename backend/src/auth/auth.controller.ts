import {
  Body,
  Controller,
  Delete,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { User } from 'src/users/entities/user.entity';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { ConfirmTotpDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto.phone, dto.purpose);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtpAndAuthenticate(
      dto.phone,
      dto.code,
      dto.purpose,
      dto.totpCode,
    );
  }

  @Post('totp/setup')
  @UseGuards(AuthGuard('jwt'))
  setupTotp(@CurrentUser() user: User) {
    return this.authService.beginTotpEnrollment(user.id, user.phone);
  }

  @Post('totp/confirm')
  @UseGuards(AuthGuard('jwt'))
  confirmTotp(@CurrentUser() user: User, @Body() dto: ConfirmTotpDto) {
    return this.authService.confirmTotpEnrollment(user.id, dto.code);
  }

  @Delete('totp')
  @UseGuards(AuthGuard('jwt'))
  disableTotp(@CurrentUser() user: User) {
    return this.authService.disableTotp(user.id);
  }
}
