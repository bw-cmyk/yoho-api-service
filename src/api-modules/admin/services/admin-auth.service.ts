import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, Role } from '../../user/entity/user.entity';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateGoogleUser(googleProfile: {
    googleId: string;
    email: string;
    displayName: string;
    avatar?: string;
  }) {
    // 查找用户
    let user = await this.userRepository.findOne({
      where: { googleId: googleProfile.googleId },
    });

    if (!user && googleProfile.email) {
      user = await this.userRepository.findOne({
        where: { googleEmail: googleProfile.email },
      });
    }

    if (!user) {
      throw new UnauthorizedException('用户不存在，请先注册');
    }

    // 检查 role 是否为 1000 (INNER)
    if (user.role !== Role.INNER) {
      throw new ForbiddenException('您没有管理员权限');
    }

    // 检查是否被封禁
    if (user.banned) {
      throw new ForbiddenException('您的账号已被封禁');
    }

    return user;
  }

  async login(user: User) {
    const payload = {
      sub: user.id,
      username: user.username,
      nickname: user.nickname,
      email: user.email || user.googleEmail,
      role: user.role,
      type: 'admin',
    };

    return {
      access_token: this.jwtService.sign(payload, { expiresIn: '24h' }),
      user: {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email || user.googleEmail,
        role: user.role,
      },
    };
  }

  async verifyToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'admin') {
        throw new UnauthorizedException('Invalid admin token');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
