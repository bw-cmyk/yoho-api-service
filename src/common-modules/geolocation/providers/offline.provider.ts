import { Injectable, Logger } from '@nestjs/common';
import * as geoip from 'geoip-lite';
import {
  GeolocationData,
  GeoipLiteResult,
} from '../interfaces/geolocation.interface';

/**
 * 离线地理定位提供者
 * 使用 geoip-lite 库进行本地 IP 地理定位查询
 */
@Injectable()
export class OfflineProvider {
  private readonly logger = new Logger(OfflineProvider.name);

  /**
   * 查询 IP 地址的地理位置（离线数据库）
   * @param ip IP 地址
   * @returns 地理定位数据，如果未找到返回 null
   */
  async lookup(ip: string): Promise<GeolocationData | null> {
    try {
      const result = geoip.lookup(ip) as GeoipLiteResult | null;

      if (!result) {
        this.logger.debug(`Offline lookup failed for IP: ${ip}`);
        return null;
      }

      // 转换为标准格式
      const data: GeolocationData = {
        ip,
        country: this.getCountryName(result.country),
        countryCode: result.country,
        city: result.city || 'Unknown',
        region: result.region || undefined,
        latitude: result.ll?.[0] || undefined,
        longitude: result.ll?.[1] || undefined,
        timezone: result.timezone || undefined,
        source: 'offline',
        confidence: this.calculateConfidence(result),
        timestamp: Date.now(),
      };

      this.logger.debug(
        `Offline lookup successful for IP: ${ip}, confidence: ${data.confidence}`,
      );

      return data;
    } catch (error) {
      this.logger.error(`Error in offline lookup for IP ${ip}:`, error);
      return null;
    }
  }

  /**
   * 计算数据置信度
   * 有城市+地区+坐标 = high
   * 有城市 = medium
   * 否则 = low
   */
  private calculateConfidence(
    result: GeoipLiteResult,
  ): 'high' | 'medium' | 'low' {
    const hasCity = !!result.city;
    const hasRegion = !!result.region;
    const hasCoordinates = result.ll && result.ll.length === 2;

    if (hasCity && hasRegion && hasCoordinates) {
      return 'high';
    }

    if (hasCity) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * 获取国家全名
   * geoip-lite 只返回国家代码，这里提供一些常见国家的映射
   * 对于未映射的国家，返回国家代码
   */
  private getCountryName(countryCode: string): string {
    const countryNames: Record<string, string> = {
      US: 'United States',
      CN: 'China',
      JP: 'Japan',
      KR: 'South Korea',
      GB: 'United Kingdom',
      DE: 'Germany',
      FR: 'France',
      CA: 'Canada',
      AU: 'Australia',
      IN: 'India',
      BR: 'Brazil',
      RU: 'Russia',
      SG: 'Singapore',
      HK: 'Hong Kong',
      TW: 'Taiwan',
      IT: 'Italy',
      ES: 'Spain',
      NL: 'Netherlands',
      SE: 'Sweden',
      CH: 'Switzerland',
      // 可以根据需要添加更多国家
    };

    return countryNames[countryCode] || countryCode;
  }

  /**
   * 检查离线数据库是否可用
   */
  isAvailable(): boolean {
    try {
      // 测试查询一个已知的 IP（Google DNS）
      const testResult = geoip.lookup('8.8.8.8');
      return !!testResult;
    } catch (error) {
      this.logger.error('Offline database unavailable:', error);
      return false;
    }
  }
}
