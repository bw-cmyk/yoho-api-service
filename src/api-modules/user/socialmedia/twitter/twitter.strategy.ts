import { Request } from 'express';
import { Strategy } from '@superfaceai/passport-twitter-oauth2';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { URL } from 'url';
import { isValidUltiverseUrl } from '../utils';

@Injectable()
export class TwitterStrategy extends PassportStrategy(Strategy) {
  _callbackURL: string;

  constructor() {
    super({
      clientType: 'confidential', //depends on your Twitter app settings, valid values are `confidential` or `public`
      clientID: 'dVgyX3M3bzNLUlIxNEphQl9Cc3k6MTpjaQ',
      clientSecret: 'xGUa3ZERjS5De8IPI5S6ZjYdweDJyxDwi4eazR4e8FSJWkRRQI',
      scope: ['tweet.read', 'users.read', 'follows.read', 'offline.access'],
      callbackURL: process.env.TWITTER_CALLBACK_URL,
      passReqToCallback: true,
      pkce: false,
    });
  }

  async authenticate(request: Request, opt) {
    const { callbackURL } = request.query;
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
