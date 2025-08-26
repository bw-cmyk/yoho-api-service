import { Request } from 'express';
import { Strategy } from 'passport-discord';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { URL } from 'url';
import { isValidUltiverseUrl } from '../utils';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      clientID: '1038062301871358022',
      scope: ['identify', 'email', 'guilds', 'guilds.join'],
      clientSecret: 'Dqd55IArnM2x-cbcV_u9s7Rq3p9-5YSc',
      callbackURL: process.env.DISCORD_CALLBACK_URL,
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
