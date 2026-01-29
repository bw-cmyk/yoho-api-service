import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserSetting } from '../entities/user-setting.entity';
import { RedisService } from '../../../common-modules/redis/redis.service';

@Injectable()
export class UserSettingService {
  constructor(
    @InjectRepository(UserSetting)
    private userSettingRepository: Repository<UserSetting>,
    private redisService: RedisService,
  ) {}

  /**
   * 获取用户设置
   */
  async get(
    userId: string,
    key: string,
    defaultValue?: string,
  ): Promise<string> {
    const cacheKey = `user:setting:${userId}:${key}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) return cached;

    const setting = await this.userSettingRepository.findOne({
      where: { userId, settingKey: key },
    });

    const value = setting?.settingValue || defaultValue || '';
    if (value) {
      await this.redisService.set(cacheKey, value, 86400); // 24小时
    }
    return value;
  }

  /**
   * 设置用户设置
   */
  async set(userId: string, key: string, value: string): Promise<void> {
    await this.userSettingRepository.upsert(
      { userId, settingKey: key, settingValue: value },
      ['userId', 'settingKey'],
    );

    const cacheKey = `user:setting:${userId}:${key}`;
    await this.redisService.set(cacheKey, value, 86400);
  }

  /**
   * 批量获取用户设置
   */
  async getMultiple(
    userId: string,
    keys: string[],
  ): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    for (const key of keys) {
      const value = await this.get(userId, key);
      if (value) result.set(key, value);
    }
    return result;
  }

  /**
   * 批量获取多用户的某个设置
   */
  async getBatch(userIds: string[], key: string): Promise<Map<string, string>> {
    const result = new Map<string, string>();
    for (const userId of userIds) {
      const value = await this.get(userId, key);
      if (value) result.set(userId, value);
    }
    return result;
  }

  /**
   * 删除设置
   */
  async delete(userId: string, key: string): Promise<void> {
    await this.userSettingRepository.delete({ userId, settingKey: key });
    await this.redisService.del(`user:setting:${userId}:${key}`);
  }
}
