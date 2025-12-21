import { Response, CookieOptions } from 'express';

export enum COOKIE_NAMES {
  ACCESS_TOKEN = 'access_token',
  REFRESH_TOKEN = 'refresh_token',
}

export const COOKIE_EXPIRATION = {
  ACCESS: 15 * 60 * 1000,
  REFRESH: 7 * 24 * 60 * 60 * 1000,
};

export const setResCookie = (res: Response, name: COOKIE_NAMES, token: string, expiresInMs: number) => {
  const options: CookieOptions = {
    httpOnly: true, // Prevents JS access (XSS protection)
    secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
    sameSite: 'strict', // CSRF protection
    path: '/',
    maxAge: expiresInMs,
  };

  res.cookie(name, token, options);
};

export const clearResCookie = (res: Response, name: COOKIE_NAMES) => {
  res.clearCookie(name, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  });
};
