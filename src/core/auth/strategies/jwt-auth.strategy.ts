import { Request } from 'express';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from 'src/modules/users/enums/user-role.enum';
import { EnvVars } from 'src/config/envValidationSchema';
export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number; // Issued at (added by passport-jwt)
  exp?: number; // Expiration time (added by passport-jwt)
}

const getAccessTokenFromCookies = (req: Request): string | null => {
  let token: string | null = null;
  if (req && req.cookies) {
    token = req.cookies['access_token'] as string;
  }
  return token;
};

@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService<EnvVars, true>) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([getAccessTokenFromCookies, ExtractJwt.fromAuthHeaderAsBearerToken()]),
      ignoreExpiration: false, // Expired JWT tokens will not be authorized
      secretOrKey: configService.get('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}

export type JwtUserType = ReturnType<JwtAuthStrategy['validate']>;
