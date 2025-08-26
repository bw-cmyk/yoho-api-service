import { Request } from 'express';
import { Strategy } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { URL } from 'url';
import { isValidUltiverseUrl } from '../utils';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ['email', 'profile'],
      sessionKey: 'oauth:google',
      passReqToCallback: true,
    });
  }

  async authenticate(request: Request, opt) {
    const { callbackURL } = request.query;
    request.session['lastAuthTime'] = Date.now();
    this.redirect = (location: string) => {
      const uri = new URL(location);
      const result = JSON.stringify({
        data: {
          authorizationURL: uri.toString(),
        },
      });
      request.res.setHeader('Content-Length', `${result.length}`);
      request.res.setHeader('Content-Type', `application/json`);
      request.res.write(result);
      request.res.end();
    };

    try {
      if (callbackURL && !isValidUltiverseUrl(callbackURL as string)) {
        throw new BadRequestException('Invalid redirectURL');
      }
      if (callbackURL && isValidUltiverseUrl(callbackURL as string)) {
        opt.callbackURL = callbackURL;
      }
      super.authenticate(request, opt);
    } catch (e) {
      this.error(new UnauthorizedException(e.message));
    }
  }

  async validate(
    request: Request,
    accessToken: string,
    refreshToken: string,
    profile: any,
  ): Promise<any> {
    return profile;
  }
}
