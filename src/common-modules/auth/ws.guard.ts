import { CanActivate, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable } from 'rxjs';

@Injectable()
export class WsGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(
    context: any,
  ): boolean | any | Promise<boolean | any> | Observable<boolean | any> {
    if (!context?.args[0]?.handshake?.auth?.token) {
      console.error(`No Token`);
      return false;
    }

    const auth_token = context.args[0].handshake.auth.token;
    try {
      const decoded = this.jwtService.verify(auth_token);
      if (!decoded) {
        console.error(`Invalid token ${auth_token}`);
        return false;
      }
      context.args[0].handshake.auth.user = decoded;
      return true;
    } catch (ex) {
      console.log(ex);
      return false;
    }
  }
}
