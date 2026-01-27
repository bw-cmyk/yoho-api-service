import { Request } from 'express';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminGoogleStrategy extends PassportStrategy(
  Strategy,
  'admin-google',
) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL:
        process.env.ADMIN_GOOGLE_CALLBACK_URL ||
        'http://localhost:3000/admin/login',
      scope: ['email', 'profile'],
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;
    const user = {
      googleId: id,
      email: emails?.[0]?.value,
      displayName,
      avatar: photos?.[0]?.value,
      accessToken,
    };
    done(null, user);
  }
}
