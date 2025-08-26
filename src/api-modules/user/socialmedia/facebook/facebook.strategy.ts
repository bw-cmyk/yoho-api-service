import { Request } from 'express';
import { Strategy } from 'passport-facebook';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { URL } from 'url';
import { isValidUltiverseUrl } from '../utils';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy) {
  _callbackURL: string;

  constructor() {
    super({
      clientID: '934888397625457',
      clientSecret: '876a5c332790e3d14f80e74037c18bfd',
      callbackURL: process.env.FACEBOOK_CALLBACK_URL,
      passReqToCallback: true,
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
