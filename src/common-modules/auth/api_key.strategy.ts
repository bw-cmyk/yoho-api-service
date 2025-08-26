import { HeaderAPIKeyStrategy } from 'passport-headerapikey';
import { Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class ApiKeyStrategy extends HeaderAPIKeyStrategy {
  validate(...args: any[]) {
    // const checkKey = await this.authService.validateApiKey(apiKey);
    // done(checkKey);
  }
  constructor(private readonly authService: AuthService) {
    super(
      { header: 'X-API-KEY', prefix: '' },
      false,
      async (apiKey, done, req) => {
        const checkKey = await this.authService.validateApiKey(apiKey);
        if (!checkKey) {
          return done(null, false);
        }
        done(null, true);
      },
    );
  }
}
