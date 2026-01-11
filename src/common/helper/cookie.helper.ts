import { CookieSerializeOptions } from '@fastify/cookie';
import { FastifyReply } from 'fastify';

export enum COOKIE_NAMES {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
}

export const COOKIE_EXPIRATION = {
  ACCESS: 15 * 60 * 1000,
  REFRESH: 7 * 24 * 60 * 60 * 1000,
};

export const setResCookie = (res: FastifyReply, name: COOKIE_NAMES, token: string, expiresInMs: number) => {
  const options: CookieSerializeOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: expiresInMs,
  };

  res.cookie(name, token, options);
};

export const clearResCookie = (res: FastifyReply, name: COOKIE_NAMES) => {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};
