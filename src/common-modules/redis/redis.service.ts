import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /**
   * 获取Redis客户端实例
   */
  getClient(): Redis {
    return this.redis;
  }

  /**
   * 设置键值对
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.redis.setex(key, ttl, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  /**
   * 删除键
   */
  async del(key: string): Promise<number> {
    return await this.redis.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<number> {
    return await this.redis.exists(key);
  }

  /**
   * 设置过期时间
   */
  async expire(key: string, seconds: number): Promise<number> {
    return await this.redis.expire(key, seconds);
  }

  /**
   * 获取剩余过期时间
   */
  async ttl(key: string): Promise<number> {
    return await this.redis.ttl(key);
  }

  /**
   * 原子性递增
   */
  async incr(key: string): Promise<number> {
    return await this.redis.incr(key);
  }

  /**
   * 原子性递减
   */
  async decr(key: string): Promise<number> {
    return await this.redis.decr(key);
  }

  /**
   * 列表操作 - 从左侧推入
   */
  async lpush(key: string, ...values: string[]): Promise<number> {
    return await this.redis.lpush(key, ...values);
  }

  /**
   * 列表操作 - 从右侧弹出
   */
  async rpop(key: string): Promise<string | null> {
    return await this.redis.rpop(key);
  }

  /**
   * 列表操作 - 阻塞式从右侧弹出
   */
  async brpop(key: string, timeout: number): Promise<[string, string] | null> {
    const result = await this.redis.brpop([key], timeout);
    return result ? [result[0], result[1]] : null;
  }

  /**
   * 获取列表长度
   */
  async llen(key: string): Promise<number> {
    return await this.redis.llen(key);
  }

  /**
   * 获取列表指定范围的元素
   */
  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return await this.redis.lrange(key, start, stop);
  }

  /**
   * 哈希表操作 - 设置字段
   */
  async hset(key: string, field: string, value: string): Promise<number> {
    return await this.redis.hset(key, field, value);
  }

  /**
   * 哈希表操作 - 获取字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    return await this.redis.hget(key, field);
  }

  /**
   * 哈希表操作 - 获取所有字段
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    return await this.redis.hgetall(key);
  }

  /**
   * 哈希表操作 - 删除字段
   */
  async hdel(key: string, ...fields: string[]): Promise<number> {
    return await this.redis.hdel(key, ...fields);
  }

  /**
   * 分布式锁 - 获取锁
   */
  async acquireLock(lockKey: string, ttl = 30): Promise<boolean> {
    const result = await this.redis.set(lockKey, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * 分布式锁 - 释放锁
   */
  async releaseLock(lockKey: string): Promise<void> {
    await this.redis.del(lockKey);
  }

  /**
   * 健康检查
   */
  async ping(): Promise<string> {
    return await this.redis.ping();
  }
}
