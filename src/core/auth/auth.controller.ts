import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { clearResCookie, COOKIE_EXPIRATION, COOKIE_NAMES, setResCookie } from '../../common/helper/cookie.helper';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { type JwtUserType } from './strategies/jwt-auth.strategy';
import { Public } from 'src/common/decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';
import { CustomThrottlerGuard } from './guards/throttle.guard';
import type { FastifyReply } from 'fastify';
import { plainToInstance } from 'class-transformer';
import { UserDto } from 'src/modules/users/dto/user.dto';

@Controller('auth')
@UseGuards(JwtAuthGuard, CustomThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 10000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user and set cookies',
    description: 'Returns user data',
    responses: { 200: { description: 'Success' }, 401: { description: 'Unauthorized' } },
    operationId: 'login',
  })
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) response: FastifyReply) {
    const userLoginData = await this.authService.login(loginDto);
    const { access_token, refresh_token, ...user } = userLoginData;
    setResCookie(response, COOKIE_NAMES.ACCESS_TOKEN, access_token, COOKIE_EXPIRATION.ACCESS);
    setResCookie(response, COOKIE_NAMES.REFRESH_TOKEN, refresh_token, COOKIE_EXPIRATION.REFRESH);
    return user;
  }

  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user and remove cookies',
    responses: { 200: { description: 'Success' }, 401: { description: 'Unauthorized' } },
    operationId: 'logout',
  })
  async logout(@GetUser('id') userId: JwtUserType['id'], @Res({ passthrough: true }) response: FastifyReply) {
    clearResCookie(response, COOKIE_NAMES.ACCESS_TOKEN);
    clearResCookie(response, COOKIE_NAMES.REFRESH_TOKEN);
    return this.authService.logout(userId);
  }

  @Get('whoami')
  whoami(@GetUser() user: JwtUserType) {
    return user;
  }
}
