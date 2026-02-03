import { Request } from 'express';
import { IpValidator } from './ip-validator.util';

/**
 * IP 提取工具类
 * 从 Express Request 中提取真实客户端 IP 地址
 * 处理代理、负载均衡器等场景
 */
export class IpExtractor {
  /**
   * 从 Express Request 中提取真实 IP 地址
   * 优先级：X-Forwarded-For → X-Real-IP → CF-Connecting-IP → req.ip
   *
   * @param req Express Request 对象
   * @returns 提取并规范化后的 IP 地址
   */
  static extractIp(req: Request): string | null {
    // 1. 尝试从 X-Forwarded-For 获取（最常见的代理头）
    const xForwardedFor = this.getHeader(req, 'x-forwarded-for');
    if (xForwardedFor) {
      const ip = this.parseXForwardedFor(xForwardedFor);
      if (ip) {
        return IpValidator.normalizeIp(ip);
      }
    }

    // 2. 尝试从 X-Real-IP 获取（Nginx 代理常用）
    const xRealIp = this.getHeader(req, 'x-real-ip');
    if (xRealIp && IpValidator.isValidIp(xRealIp)) {
      return IpValidator.normalizeIp(xRealIp);
    }

    // 3. 尝试从 CF-Connecting-IP 获取（Cloudflare）
    const cfConnectingIp = this.getHeader(req, 'cf-connecting-ip');
    if (cfConnectingIp && IpValidator.isValidIp(cfConnectingIp)) {
      return IpValidator.normalizeIp(cfConnectingIp);
    }

    // 4. 尝试从 X-Client-IP 获取
    const xClientIp = this.getHeader(req, 'x-client-ip');
    if (xClientIp && IpValidator.isValidIp(xClientIp)) {
      return IpValidator.normalizeIp(xClientIp);
    }

    // 5. 回退到 Express 的 req.ip
    if (req.ip) {
      return IpValidator.normalizeIp(req.ip);
    }

    // 6. 最后尝试从 socket 获取
    const socketIp = (req.socket?.remoteAddress || req.connection?.remoteAddress) as string;
    if (socketIp) {
      return IpValidator.normalizeIp(socketIp);
    }

    return null;
  }

  /**
   * 解析 X-Forwarded-For 头
   * 格式：client, proxy1, proxy2
   * 返回第一个有效的公网 IP
   *
   * @param xForwardedFor X-Forwarded-For 头的值
   * @returns 第一个有效的公网 IP 地址
   */
  private static parseXForwardedFor(xForwardedFor: string): string | null {
    if (!xForwardedFor) {
      return null;
    }

    // X-Forwarded-For 可能包含多个 IP，用逗号分隔
    const ips = xForwardedFor.split(',').map(ip => ip.trim());

    // 优先返回第一个有效的公网 IP
    for (const ip of ips) {
      if (IpValidator.isPublicIp(ip)) {
        return ip;
      }
    }

    // 如果没有公网 IP，返回第一个有效的 IP（可能是私有 IP）
    for (const ip of ips) {
      if (IpValidator.isValidIp(ip)) {
        return ip;
      }
    }

    return null;
  }

  /**
   * 安全地获取请求头
   * @param req Express Request 对象
   * @param headerName 头名称
   * @returns 头的值，如果是数组则返回第一个元素
   */
  private static getHeader(req: Request, headerName: string): string | null {
    const value = req.headers[headerName.toLowerCase()];

    if (!value) {
      return null;
    }

    // 如果是数组，返回第一个元素
    if (Array.isArray(value)) {
      return value[0] || null;
    }

    return value;
  }

  /**
   * 提取 IP 并验证是否为公网 IP
   * @param req Express Request 对象
   * @returns 公网 IP 地址，如果不是公网 IP 则返回 null
   */
  static extractPublicIp(req: Request): string | null {
    const ip = this.extractIp(req);

    if (!ip || !IpValidator.isPublicIp(ip)) {
      return null;
    }

    return ip;
  }
}
