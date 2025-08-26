import * as jwt from 'jsonwebtoken';
import {
  UnauthorizedException,
} from '@nestjs/common';

const validateEmail = (email: string): boolean => {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

export class MagicLink {
  private readonly jwtSecret = 'c3RvcnktbWFnaWMtbGluay0yMzIzMg==';

  generateMagicLinkToken(email: string): string {
    if (!validateEmail(email)) {
      throw new UnauthorizedException('Invalid email');
    }

    const token = jwt.sign({ email }, this.jwtSecret, { expiresIn: '1h' });
    return token;
  }

  verifyToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}