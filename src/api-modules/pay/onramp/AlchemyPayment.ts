import crypto from 'crypto';
import { BasePayment } from './BasePayment';

const AlchemyPaymentMethods = [
  {
    name: ' Visa/Master Card',
    code: '10001',
  },
  {
    name: 'Apple Pay',
    code: '501',
  },
  {
    name: 'Google Pay',
    code: '701',
  },
];

export interface AlchemyPaymentConfig {
  apiKey: string;
  secretKey: string;
  baseUrl: string;
}

export interface AlchemyPaymentRequest {
  currency: string;
  method: string;
  amount: number;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AlchemyPaymentResponse {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  createdAt: string;
  expiresAt?: string;
  paymentUrl?: string;
}

export interface AlchemyPaymentStatus {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  amount: number;
  currency: string;
  updatedAt: string;
  transactionHash?: string;
}

export class AlchemyPayment extends BasePayment {
  private readonly config: AlchemyPaymentConfig;

  constructor(config: AlchemyPaymentConfig) {
    super();
    this.config = config;
  }

  /**
   * 获取支持的支付方式
   */
  async getPaymentMethods(currency: string): Promise<string[]> {
    try {
      // 这里应该调用 Alchemy API 获取支持的支付方式
      // 目前返回默认支持的支付方式
      const supportedMethods = {
        USD: ['credit_card', 'bank_transfer', 'crypto'],
        USDT: ['crypto', 'bank_transfer'],
        BTC: ['crypto'],
        ETH: ['crypto'],
      };

      return supportedMethods[currency.toUpperCase()] || ['crypto'];
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      throw new Error('Failed to get payment methods');
    }
  }

  /**
   * 创建支付订单
   */
  async createPayment(
    currency: string,
    method: string,
    amount: number,
  ): Promise<AlchemyPaymentResponse> {
    try {
      const timestamp = Date.now();
      const requestBody = {
        currency: currency.toUpperCase(),
        method,
        amount: amount.toString(),
        timestamp,
      };

      const signature = this.generateSignature(
        timestamp,
        'POST',
        '/api/v1/payments',
        JSON.stringify(requestBody),
      );

      // 这里应该调用 Alchemy API 创建支付
      // 目前返回模拟响应
      const mockResponse: AlchemyPaymentResponse = {
        paymentId: `alchemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 'pending',
        amount,
        currency: currency.toUpperCase(),
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30分钟后过期
        paymentUrl: `https://alchemy.com/pay/${this.generatePaymentId()}`,
      };

      return mockResponse;
    } catch (error) {
      console.error('Failed to create payment:', error);
      throw new Error('Failed to create payment');
    }
  }

  /**
   * 获取支付状态
   */
  async getPaymentStatus(paymentId: string): Promise<AlchemyPaymentStatus> {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(
        timestamp,
        'GET',
        `/api/v1/payments/${paymentId}`,
        '',
      );

      // 这里应该调用 Alchemy API 获取支付状态
      // 目前返回模拟响应
      const mockStatus: AlchemyPaymentStatus = {
        paymentId,
        status: 'pending',
        amount: 100,
        currency: 'USD',
        updatedAt: new Date().toISOString(),
      };

      return mockStatus;
    } catch (error) {
      console.error('Failed to get payment status:', error);
      throw new Error('Failed to get payment status');
    }
  }

  /**
   * 获取支付详情
   */
  async getPaymentDetails(paymentId: string): Promise<AlchemyPaymentResponse> {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(
        timestamp,
        'GET',
        `/api/v1/payments/${paymentId}/details`,
        '',
      );

      // 这里应该调用 Alchemy API 获取支付详情
      // 目前返回模拟响应
      const mockDetails: AlchemyPaymentResponse = {
        paymentId,
        status: 'pending',
        amount: 100,
        currency: 'USD',
        createdAt: new Date().toISOString(),
      };

      return mockDetails;
    } catch (error) {
      console.error('Failed to get payment details:', error);
      throw new Error('Failed to get payment details');
    }
  }

  /**
   * 取消支付
   */
  async cancelPayment(paymentId: string): Promise<{ success: boolean; message: string }> {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(
        timestamp,
        'POST',
        `/api/v1/payments/${paymentId}/cancel`,
        '',
      );

      // 这里应该调用 Alchemy API 取消支付
      // 目前返回模拟响应
      return {
        success: true,
        message: 'Payment cancelled successfully',
      };
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      throw new Error('Failed to cancel payment');
    }
  }

  /**
   * 获取支持的货币
   */
  async getCurrencies(): Promise<string[]> {
    return []
  }

  /**
   * 生成 API 签名
   */
  private generateSignature(
    timestamp: number,
    method: string,
    requestUrl: string,
    body: string,
  ): string {
    const content =
      timestamp +
      method.toUpperCase() +
      this.getPath(requestUrl) +
      this.getJsonBody(body);

    const signVal = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(content, 'utf8')
      .digest('base64');

    return signVal;
  }

  /**
   * 获取请求路径
   */
  private getPath(requestUrl: string): string {
    try {
      const uri = new URL(requestUrl);
      const path = uri.pathname;
      const params = Array.from(uri.searchParams.entries());

      if (params.length === 0) {
        return path;
      }

      const sortedParams = [...params].sort(([aKey], [bKey]) =>
        aKey.localeCompare(bKey),
      );
      const queryString = sortedParams
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

      return `${path}?${queryString}`;
    } catch (error) {
      console.error('Invalid URL:', requestUrl);
      return requestUrl;
    }
  }

  /**
   * 处理 JSON 请求体
   */
  private getJsonBody(body: string): string {
    if (!body || body.trim() === '') {
      return '';
    }

    let map: Record<string, any>;

    try {
      map = JSON.parse(body);
    } catch (error) {
      console.error('Invalid JSON body:', error);
      return '';
    }

    if (Object.keys(map).length === 0) {
      return '';
    }

    map = this.removeEmptyKeys(map);
    map = this.sortObject(map);

    return JSON.stringify(map);
  }

  /**
   * 移除空值键
   */
  private removeEmptyKeys(map: Record<string, any>): Record<string, any> {
    const retMap: Record<string, any> = {};

    for (const [key, value] of Object.entries(map)) {
      if (value !== null && value !== '' && value !== undefined) {
        retMap[key] = value;
      }
    }

    return retMap;
  }

  /**
   * 排序对象
   */
  private sortObject(obj: any): any {
    if (typeof obj === 'object' && obj !== null) {
      if (Array.isArray(obj)) {
        return this.sortList(obj);
      } else {
        return this.sortMap(obj);
      }
    }

    return obj;
  }

  /**
   * 排序 Map
   */
  private sortMap(map: Record<string, any>): Record<string, any> {
    const sortedMap = new Map(
      Object.entries(this.removeEmptyKeys(map)).sort(([aKey], [bKey]) =>
        aKey.localeCompare(bKey),
      ),
    );

    for (const [key, value] of sortedMap.entries()) {
      if (typeof value === 'object' && value !== null) {
        sortedMap.set(key, this.sortObject(value));
      }
    }

    return Object.fromEntries(sortedMap.entries());
  }

  /**
   * 排序列表
   */
  private sortList(list: any[]): any[] {
    const objectList: any[] = [];
    const intList: number[] = [];
    const floatList: number[] = [];
    const stringList: string[] = [];
    const jsonArray: any[] = [];

    for (const item of list) {
      if (typeof item === 'object' && item !== null) {
        jsonArray.push(item);
      } else if (Number.isInteger(item)) {
        intList.push(item);
      } else if (typeof item === 'number') {
        floatList.push(item);
      } else if (typeof item === 'string') {
        stringList.push(item);
      } else {
        intList.push(item);
      }
    }

    intList.sort((a, b) => a - b);
    floatList.sort((a, b) => a - b);
    stringList.sort();

    objectList.push(...intList, ...floatList, ...stringList, ...jsonArray);
    list.length = 0;
    list.push(...objectList);

    const retList: any[] = [];

    for (const item of list) {
      if (typeof item === 'object' && item !== null) {
        retList.push(this.sortObject(item));
      } else {
        retList.push(item);
      }
    }

    return retList;
  }

  /**
   * 生成支付ID
   */
  private generatePaymentId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 获取配置
   */
  getConfig(): AlchemyPaymentConfig {
    return { ...this.config };
  }
}
