import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import passport from 'passport';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: any, res: any, next: any) {
    passport.authenticate(
      'headerapikey',
      { session: false, failureMessage: 'unauthorized' },
      (value) => {
        if (value) {
          next();
        } else {
          next(new UnauthorizedException());
        }
      },
    )(req, res, next);
  }
}
