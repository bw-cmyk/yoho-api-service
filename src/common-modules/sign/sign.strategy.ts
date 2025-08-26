import { Request } from 'express';
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { SignService } from './sign.service';

@Injectable()
export class SignStrategy extends PassportStrategy(Strategy, 'sign') {
  constructor(private signService: SignService) {
    super({
      passReqToCallback: true,
    });
  }

  async authenticate(request: Request) {
    const {
      address = '',
      signature = '',
      chainId = 56,
      feature,
    } = request.body;
    try {
      const wallet = await this.signService.verify(
        address,
        signature,
        'assets-wallet-login',
        chainId,
      );
      this.success({
        wallet,
        chainId,
        feature,
      });
    } catch (e) {
      this.error(new UnauthorizedException(e.message));
    }
  }
}
