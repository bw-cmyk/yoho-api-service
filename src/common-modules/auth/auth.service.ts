import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from './api_key.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,

    private jwtService: JwtService,
  ) {}
  async validateApiKey(apiKey: string): Promise<boolean> {
    const item = await this.apiKeyRepository.findOne({
      where: { key: apiKey },
    });

    return !!item;
  }

  async login(info: any) {
    const payload = {
      username: info.name,
      sub: info.id,
      nickname: info.nickname,
    };

    return {
      uid: payload.sub,
      id: payload.sub,
      nickname: payload.nickname || payload.username,
      access_token: this.jwtService.sign(payload),
    };
  }
}
