import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { type Response } from 'express';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { COOKIE_EXPIRATION, COOKIE_NAMES, setResCookie } from '../../common/helper/cookie.helper';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CustomThrottlerGuard } from './guards/throttle.guard';
import * as jwtStrategy from './strategies/jwt-auth.strategy';

@UseGuards(CustomThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const userAuthData = await this.authService.login(loginDto);
    const { access_token, refresh_token, ...user } = userAuthData;
    setResCookie(response, COOKIE_NAMES.ACCESS_TOKEN, access_token, COOKIE_EXPIRATION.ACCESS);
    setResCookie(response, COOKIE_NAMES.REFRESH_TOKEN, refresh_token, COOKIE_EXPIRATION.REFRESH);
    return user;
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('whoami')
  @UseGuards(JwtAuthGuard)
  whoami(@GetUser() user: jwtStrategy.JwtPayload) {
    return user;
  }
}
