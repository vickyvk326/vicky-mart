import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload } from './jwt-auth.strategy';
import { EnvVars } from 'src/config/envValidationSchema';

const getRefreshTokenFromCookies = (req: Request): string | null => {
  let token: string | null = null;
  if (req && req.cookies) {
    token = req.cookies['refresh_token'] as string;
  }
  return token;
};
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService<EnvVars, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([getRefreshTokenFromCookies]),
      secretOrKey: configService.get('JWT_SECRET'),
      passReqToCallback: true, // Allows us to access the request in validate()
    });
  }

  validate(req: Request, payload: JwtPayload) {
    const refreshToken = req.cookies?.['refresh_token'] as string;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
    };
  }
}
