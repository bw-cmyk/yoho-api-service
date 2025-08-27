import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'P-w8Iewr3efdfd8r-dsdsrew4556y6vwq=',
    });
  }

  async validate(payload: any) {
    return {
      iat: payload.iat,
      exp: payload.exp,
      id: payload.sub,
      name: payload.name,
      token: payload.token,
      address: payload.address,
    };
  }
}
