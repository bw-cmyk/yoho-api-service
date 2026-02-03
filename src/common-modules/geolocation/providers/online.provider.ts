import { Injectable, Logger } from '@nestjs/common';
import {
  GeolocationData,
  IpApiComResult,
  IpApiCoResult,
} from '../interfaces/geolocation.interface';
import { RedisService } from '../../redis/redis.service';

/**
 * 在线地理定位提供者
 * 使用外部 API 进行 IP 地理定位查询
 * 主 API: ip-api.com，备用 API: ipapi.co
 */
@Injectable()
export class OnlineProvider {
  private readonly logger = new Logger(OnlineProvider.name);

  // API 配置
  private readonly PRIMARY_API_URL = 'http://ip-api.com/json';
  private readonly FALLBACK_API_URL = 'https://ipapi.co';
  private readonly RATE_LIMIT_KEY = 'geolocation:api:calls:minute';
  private readonly RATE_LIMIT = 40; // 每分钟最多 40 次调用（留 5 个 buffer）
  private readonly TIMEOUT_MS = 5000; // 5 秒超时

  constructor(private readonly redisService: RedisService) {}

  /**
   * 查询 IP 地址的地理位置（在线 API）
   * @param ip IP 地址
   * @returns 地理定位数据，如果失败返回 null
   */
  async lookup(ip: string): Promise<GeolocationData | null> {
    // 检查速率限制
    if (!(await this.checkRateLimit())) {
      this.logger.warn('Rate limit exceeded for online API');
      return null;
    }

    // 先尝试主 API
    try {
      const data = await this.lookupPrimary(ip);
      if (data) {
        await this.incrementRateLimit();
        return data;
      }
    } catch (error) {
      this.logger.warn(`Primary API failed for IP ${ip}:`, error.message);
    }

    // 主 API 失败，尝试备用 API
    try {
      const data = await this.lookupFallback(ip);
      if (data) {
        await this.incrementRateLimit();
        return data;
      }
    } catch (error) {
      this.logger.error(`Fallback API failed for IP ${ip}:`, error.message);
    }

    return null;
  }

  /**
   * 使用主 API (ip-api.com) 查询
   */
  private async lookupPrimary(ip: string): Promise<GeolocationData | null> {
    const url = `${this.PRIMARY_API_URL}/${ip}`;

    try {
      const response = await this.fetchWithTimeout(url, this.TIMEOUT_MS);
      const data: IpApiComResult = await response.json();

      if (data.status === 'fail') {
        this.logger.debug(`Primary API returned fail for IP ${ip}: ${data.message}`);
        return null;
      }

      const result: GeolocationData = {
        ip: data.query,
        country: data.country,
        countryCode: data.countryCode,
        city: data.city || 'Unknown',
        region: data.regionName || undefined,
        latitude: data.lat || undefined,
        longitude: data.lon || undefined,
        timezone: data.timezone || undefined,
        source: 'online-primary',
        confidence: this.calculateConfidenceFromPrimary(data),
        timestamp: Date.now(),
      };

      this.logger.debug(`Primary API lookup successful for IP: ${ip}`);
      return result;
    } catch (error) {
      this.logger.debug(`Primary API request failed for IP ${ip}:`, error.message);
      throw error;
    }
  }

  /**
   * 使用备用 API (ipapi.co) 查询
   */
  private async lookupFallback(ip: string): Promise<GeolocationData | null> {
    const url = `${this.FALLBACK_API_URL}/${ip}/json/`;

    try {
      const response = await this.fetchWithTimeout(url, this.TIMEOUT_MS);
      const data: IpApiCoResult = await response.json();

      if (data.error) {
        this.logger.debug(`Fallback API returned error for IP ${ip}: ${data.reason}`);
        return null;
      }

      const result: GeolocationData = {
        ip: data.ip,
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city || 'Unknown',
        region: data.region || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
        timezone: data.timezone || undefined,
        source: 'online-fallback',
        confidence: this.calculateConfidenceFromFallback(data),
        timestamp: Date.now(),
      };

      this.logger.debug(`Fallback API lookup successful for IP: ${ip}`);
      return result;
    } catch (error) {
      this.logger.debug(`Fallback API request failed for IP ${ip}:`, error.message);
      throw error;
    }
  }

  /**
   * 带超时的 fetch 请求
   */
  private async fetchWithTimeout(
    url: string,
    timeout: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'YohoAPI/1.0',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * 检查是否超过速率限制
   */
  private async checkRateLimit(): Promise<boolean> {
    try {
      const client = this.redisService.getClient();
      const count = await client.get(this.RATE_LIMIT_KEY);

      if (!count) {
        return true;
      }

      return parseInt(count, 10) < this.RATE_LIMIT;
    } catch (error) {
      this.logger.error('Error checking rate limit:', error);
      // 如果 Redis 出错，允许请求通过
      return true;
    }
  }

  /**
   * 增加速率限制计数器
   */
  private async incrementRateLimit(): Promise<void> {
    try {
      const client = this.redisService.getClient();
      const count = await client.incr(this.RATE_LIMIT_KEY);

      // 如果是第一次调用，设置过期时间为 60 秒
      if (count === 1) {
        await client.expire(this.RATE_LIMIT_KEY, 60);
      }
    } catch (error) {
      this.logger.error('Error incrementing rate limit:', error);
    }
  }

  /**
   * 计算主 API 数据的置信度
   */
  private calculateConfidenceFromPrimary(
    data: IpApiComResult,
  ): 'high' | 'medium' | 'low' {
    const hasCity = !!data.city;
    const hasRegion = !!data.regionName;
    const hasCoordinates = typeof data.lat === 'number' && typeof data.lon === 'number';

    if (hasCity && hasRegion && hasCoordinates) {
      return 'high';
    }

    if (hasCity) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 计算备用 API 数据的置信度
   */
  private calculateConfidenceFromFallback(
    data: IpApiCoResult,
  ): 'high' | 'medium' | 'low' {
    const hasCity = !!data.city;
    const hasRegion = !!data.region;
    const hasCoordinates = typeof data.latitude === 'number' && typeof data.longitude === 'number';

    if (hasCity && hasRegion && hasCoordinates) {
      return 'high';
    }

    if (hasCity) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 获取当前速率限制状态
   */
  async getRateLimitStatus(): Promise<{ current: number; limit: number; remaining: number }> {
    try {
      const client = this.redisService.getClient();
      const count = await client.get(this.RATE_LIMIT_KEY);
      const current = count ? parseInt(count, 10) : 0;

      return {
        current,
        limit: this.RATE_LIMIT,
        remaining: Math.max(0, this.RATE_LIMIT - current),
      };
    } catch (error) {
      this.logger.error('Error getting rate limit status:', error);
      return {
        current: 0,
        limit: this.RATE_LIMIT,
        remaining: this.RATE_LIMIT,
      };
    }
  }
}
