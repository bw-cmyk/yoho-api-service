import { Request } from 'express';
import { Strategy } from 'passport-apple';
import { PassportStrategy } from '@nestjs/passport';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { URL } from 'url';
import { isValidUltiverseUrl } from '../utils';
import * as path from 'path';
import * as passport from 'passport';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class AppleStrategy extends Strategy {
  constructor() {
    const callback = async (
      req,
      accessToken,
      refreshToken,
      params,
      profile,
      verified,
    ) => {
      try {
        const validateResult = await this.validate(
          req,
          accessToken,
          refreshToken,
          params,
          profile,
        );
        console.log(verified);
        if (Array.isArray(validateResult)) {
          verified(null, ...validateResult);
        } else {
          verified(null, validateResult);
        }
      } catch (err) {
        verified(err, null);
      }
    };
    super(
      {
        clientID: 'io.ultiverse.account',
        teamID: '528GTB9C4U',
        keyID: 'D7NJ2YFKHG',
        privateKeyLocation: path.resolve(
          __dirname,
          '../../../AuthKey_D7NJ2YFKHG.p8',
        ),
        scope: ['identify', 'email', 'guilds', 'guilds.join'],
        clientSecret: 'Dqd55IArnM2x-cbcV_u9s7Rq3p9-5YSc',
        callbackURL: process.env.APPLE_CALLBACK_URL,
        passReqToCallback: true,
        skipUserProfile: true,
      },
      callback,
    );
    const passportInstance = this.getPassportInstance();
    passportInstance.use(this);
  }

  getPassportInstance() {
    return passport;
  }

  async authenticate(request: Request, opt) {
    const { callbackURL } = request.query;
    request.session['lastAuthTime'] = Date.now();
    // @ts-ignore
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
      // @ts-ignore
      this.error(new UnauthorizedException(e.message));
    }
  }

  async validate(
    request: Request,
    accessToken: string,
    refreshToken: string,
    idToken: string,
    profile: any,
  ): Promise<any> {
    console.log(accessToken, refreshToken, idToken);
    return jwt.decode(idToken);
  }
}
