import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'w40Obx1sz0ynrEOAyLoYPX0ciU95uoN5Xu-7tARvKEE=',
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      name: payload.name,
      token: payload.token,
      address: payload.address,
    };
  }
}
