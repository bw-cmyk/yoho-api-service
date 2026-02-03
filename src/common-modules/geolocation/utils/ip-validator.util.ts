import { isIP } from 'net';

/**
 * IP 验证工具类
 * 提供 IP 地址格式验证、私有 IP 检测、IPv6 规范化等功能
 */
export class IpValidator {
  /**
   * 私有 IPv4 地址范围
   */
  private static readonly PRIVATE_IPV4_RANGES = [
    /^127\./,                    // 127.0.0.0/8 - Loopback
    /^10\./,                     // 10.0.0.0/8 - Private
    /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 - Private
    /^192\.168\./,               // 192.168.0.0/16 - Private
    /^169\.254\./,               // 169.254.0.0/16 - Link-local
    /^0\./,                      // 0.0.0.0/8 - Reserved
  ];

  /**
   * 私有 IPv6 地址范围
   */
  private static readonly PRIVATE_IPV6_RANGES = [
    /^::1$/,                     // Loopback
    /^fe80:/,                    // Link-local
    /^fc00:/,                    // Unique local
    /^fd00:/,                    // Unique local
    /^::$/,                      // Unspecified
  ];

  /**
   * 验证 IP 地址格式是否有效
   * @param ip IP 地址字符串
   * @returns 如果是有效的 IPv4 或 IPv6 地址返回 true
   */
  static isValidIp(ip: string): boolean {
    if (!ip || typeof ip !== 'string') {
      return false;
    }

    const ipVersion = isIP(ip);
    return ipVersion === 4 || ipVersion === 6;
  }

  /**
   * 检测是否为私有 IP 地址
   * @param ip IP 地址字符串
   * @returns 如果是私有 IP 返回 true
   */
  static isPrivateIp(ip: string): boolean {
    if (!this.isValidIp(ip)) {
      return false;
    }

    const ipVersion = isIP(ip);

    if (ipVersion === 4) {
      return this.PRIVATE_IPV4_RANGES.some(range => range.test(ip));
    }

    if (ipVersion === 6) {
      const normalizedIp = this.normalizeIpv6(ip);
      return this.PRIVATE_IPV6_RANGES.some(range => range.test(normalizedIp));
    }

    return false;
  }

  /**
   * 检测是否为公网 IP 地址
   * @param ip IP 地址字符串
   * @returns 如果是公网 IP 返回 true
   */
  static isPublicIp(ip: string): boolean {
    return this.isValidIp(ip) && !this.isPrivateIp(ip);
  }

  /**
   * 规范化 IPv6 地址
   * 将 IPv4-mapped IPv6 地址（如 ::ffff:192.0.2.1）转换为 IPv4 格式
   * @param ip IPv6 地址字符串
   * @returns 规范化后的 IP 地址
   */
  static normalizeIpv6(ip: string): string {
    if (!ip) {
      return ip;
    }

    // 处理 IPv4-mapped IPv6 地址：::ffff:192.0.2.1 → 192.0.2.1
    const ipv4MappedPattern = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
    const match = ip.match(ipv4MappedPattern);

    if (match) {
      return match[1];
    }

    return ip.toLowerCase();
  }

  /**
   * 规范化 IP 地址（同时处理 IPv4 和 IPv6）
   * @param ip IP 地址字符串
   * @returns 规范化后的 IP 地址
   */
  static normalizeIp(ip: string): string {
    if (!ip) {
      return ip;
    }

    const trimmed = ip.trim();

    // 如果是 IPv6 或 IPv4-mapped IPv6，进行规范化
    if (trimmed.includes(':')) {
      return this.normalizeIpv6(trimmed);
    }

    return trimmed;
  }

  /**
   * 获取 IP 版本
   * @param ip IP 地址字符串
   * @returns 4 (IPv4), 6 (IPv6), 或 0 (无效)
   */
  static getIpVersion(ip: string): number {
    return isIP(ip);
  }
}
