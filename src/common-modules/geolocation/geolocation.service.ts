import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { RedisService } from '../redis/redis.service';
import { OfflineProvider } from './providers/offline.provider';
import { OnlineProvider } from './providers/online.provider';
import { GeolocationData } from './interfaces/geolocation.interface';
import { IpValidator } from './utils/ip-validator.util';
import { IpExtractor } from './utils/ip-extractor.util';

/**
 * 地理定位服务
 * 三层混合架构：Redis 缓存 → 离线数据库 → 在线 API
 */
@Injectable()
export class GeolocationService {
  private readonly logger = new Logger(GeolocationService.name);

  // 缓存配置
  private readonly CACHE_KEY_PREFIX = 'geolocation:ip:';
  private readonly CACHE_TTL = 86400; // 24 小时（秒）

  constructor(
    private readonly redisService: RedisService,
    private readonly offlineProvider: OfflineProvider,
    private readonly onlineProvider: OnlineProvider,
  ) {}

  /**
   * 获取 IP 地址的地理位置
   * @param ip IP 地址
   * @returns 地理定位数据
   */
  async getLocation(ip: string): Promise<GeolocationData> {
    // 1. 规范化和验证 IP
    const normalizedIp = IpValidator.normalizeIp(ip);

    if (!IpValidator.isValidIp(normalizedIp)) {
      throw new BadRequestException(`Invalid IP address: ${ip}`);
    }

    if (IpValidator.isPrivateIp(normalizedIp)) {
      throw new BadRequestException(
        `Cannot geolocate private IP address: ${normalizedIp}`,
      );
    }

    this.logger.debug(`Looking up geolocation for IP: ${normalizedIp}`);

    // 2. 检查 Redis 缓存
    const cachedData = await this.getFromCache(normalizedIp);
    if (cachedData) {
      this.logger.debug(`Cache hit for IP: ${normalizedIp}`);
      return cachedData;
    }

    // 3. 查询离线数据库
    const offlineData = await this.offlineProvider.lookup(normalizedIp);
    if (offlineData && this.isAcceptableConfidence(offlineData.confidence)) {
      this.logger.debug(
        `Offline lookup successful for IP: ${normalizedIp}, confidence: ${offlineData.confidence}`,
      );
      await this.saveToCache(normalizedIp, offlineData);
      return offlineData;
    }

    // 4. 如果离线数据置信度低或不存在，尝试在线 API
    this.logger.debug(
      `Offline data not satisfactory for IP: ${normalizedIp}, trying online API`,
    );

    const onlineData = await this.onlineProvider.lookup(normalizedIp);
    if (onlineData) {
      this.logger.debug(
        `Online lookup successful for IP: ${normalizedIp}, source: ${onlineData.source}`,
      );
      await this.saveToCache(normalizedIp, onlineData);
      return onlineData;
    }

    // 5. 如果在线 API 也失败，返回离线数据（即使置信度低）
    if (offlineData) {
      this.logger.warn(
        `Online API failed for IP: ${normalizedIp}, returning low-confidence offline data`,
      );
      await this.saveToCache(normalizedIp, offlineData);
      return offlineData;
    }

    // 6. 所有方法都失败
    throw new BadRequestException(
      `Unable to determine geolocation for IP: ${normalizedIp}`,
    );
  }

  /**
   * 从 Express Request 中提取 IP 并获取地理位置
   * @param req Express Request 对象
   * @returns 地理定位数据
   */
  async getLocationFromRequest(req: Request): Promise<GeolocationData> {
    const ip = IpExtractor.extractIp(req);

    if (!ip) {
      throw new BadRequestException('Unable to extract IP address from request');
    }

    return this.getLocation(ip);
  }

  /**
   * 从缓存获取数据
   */
  private async getFromCache(ip: string): Promise<GeolocationData | null> {
    try {
      const client = this.redisService.getClient();
      const cacheKey = this.CACHE_KEY_PREFIX + ip;
      const cachedJson = await client.get(cacheKey);

      if (!cachedJson) {
        return null;
      }

      const data: GeolocationData = JSON.parse(cachedJson);

      // 标记数据来源为缓存
      data.source = 'cache';

      return data;
    } catch (error) {
      this.logger.error(`Error reading from cache for IP ${ip}:`, error);
      return null;
    }
  }

  /**
   * 保存数据到缓存
   */
  private async saveToCache(
    ip: string,
    data: GeolocationData,
  ): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const cacheKey = this.CACHE_KEY_PREFIX + ip;

      await client.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(data),
      );

      this.logger.debug(`Saved geolocation data to cache for IP: ${ip}`);
    } catch (error) {
      this.logger.error(`Error saving to cache for IP ${ip}:`, error);
      // 缓存失败不影响主流程
    }
  }

  /**
   * 判断置信度是否可接受
   * high 和 medium 是可接受的，low 需要尝试在线 API
   */
  private isAcceptableConfidence(
    confidence: 'high' | 'medium' | 'low',
  ): boolean {
    return confidence === 'high' || confidence === 'medium';
  }

  /**
   * 清除指定 IP 的缓存
   * @param ip IP 地址
   */
  async clearCache(ip: string): Promise<void> {
    try {
      const normalizedIp = IpValidator.normalizeIp(ip);
      const client = this.redisService.getClient();
      const cacheKey = this.CACHE_KEY_PREFIX + normalizedIp;

      await client.del(cacheKey);

      this.logger.debug(`Cleared cache for IP: ${normalizedIp}`);
    } catch (error) {
      this.logger.error(`Error clearing cache for IP ${ip}:`, error);
      throw error;
    }
  }

  /**
   * 清除所有地理定位缓存
   */
  async clearAllCache(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const pattern = this.CACHE_KEY_PREFIX + '*';

      // 使用 SCAN 命令避免阻塞
      const keys: string[] = [];
      let cursor = '0';

      do {
        const result = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = result[0];
        keys.push(...result[1]);
      } while (cursor !== '0');

      if (keys.length > 0) {
        await client.del(...keys);
        this.logger.log(`Cleared ${keys.length} geolocation cache entries`);
      } else {
        this.logger.log('No geolocation cache entries to clear');
      }
    } catch (error) {
      this.logger.error('Error clearing all cache:', error);
      throw error;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    estimatedMemoryBytes: number;
  }> {
    try {
      const client = this.redisService.getClient();
      const pattern = this.CACHE_KEY_PREFIX + '*';

      let totalEntries = 0;
      let cursor = '0';

      do {
        const result = await client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          100,
        );
        cursor = result[0];
        totalEntries += result[1].length;
      } while (cursor !== '0');

      // 估算内存使用（每个条目约 500 字节）
      const estimatedMemoryBytes = totalEntries * 500;

      return {
        totalEntries,
        estimatedMemoryBytes,
      };
    } catch (error) {
      this.logger.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        estimatedMemoryBytes: 0,
      };
    }
  }
}
