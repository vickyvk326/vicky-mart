import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { type Response } from 'express';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { clearResCookie, COOKIE_EXPIRATION, COOKIE_NAMES, setResCookie } from '../../common/helper/cookie.helper';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CustomThrottlerGuard } from './guards/throttle.guard';
import { type JwtUserType } from './strategies/jwt-auth.strategy';

@UseGuards(CustomThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user and set cookies',
    description: 'Returns user data',
    responses: { 200: { description: 'Success' }, 401: { description: 'Unauthorized' } },
    operationId: 'login',
  })
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

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user and remove cookies',
    responses: { 200: { description: 'Success' }, 401: { description: 'Unauthorized' } },
    operationId: 'logout',
  })
  @UseGuards(JwtAuthGuard)
  async logout(@GetUser('id') userId: JwtUserType['id'], @Res({ passthrough: true }) response: Response) {
    clearResCookie(response, COOKIE_NAMES.ACCESS_TOKEN);
    clearResCookie(response, COOKIE_NAMES.REFRESH_TOKEN);
    return this.authService.logout(userId);
  }

  @Get('whoami')
  @UseGuards(JwtAuthGuard)
  whoami(@GetUser() user: JwtUserType) {
    return user;
  }
}
