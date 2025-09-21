import { EstimatePriceDto } from '../../type/EstimatePriceDto';
import { PayMethod, PayType } from '../../type/PayMethod';
import { BasePayment } from '../BasePayment';
import { PaymentRequest } from '../PaymentManager';

export interface OnRamperPaymentConfig {
  apiKey: string;
  baseUrl: string;
}

export interface OnRamperRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  data?: any;
  headers?: Record<string, string>;
}

export class OnRamperPayment extends BasePayment {
  private readonly config: OnRamperPaymentConfig;

  constructor(config: OnRamperPaymentConfig) {
    super();
    this.config = config;
  }

  /**
   * 通用请求方法，使用API Key进行鉴权
   */
  private async request<T>(options: OnRamperRequestOptions): Promise<T> {
    const { method, path, data, headers = {} } = options;
    const bodyString = data ? JSON.stringify(data) : '';

    // 构建请求头，使用API Key进行鉴权
    const requestHeaders = {
      'Content-Type': 'application/json',
      Authorization: this.config.apiKey,
      ...headers,
    };

    // 构建请求选项
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
    };

    // 如果有数据且不是 GET 请求，添加请求体
    if (data && method !== 'GET') {
      fetchOptions.body = bodyString;
    }

    try {
      const response = await fetch(
        `${this.config.baseUrl}${path}`,
        fetchOptions,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, message: ${errorText}`,
        );
      }

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(`Request failed for ${method} ${path}:`, error);
      throw new Error(
        `Request failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  getCurrencies(): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  getPaymentMethods(
    _currency: string,
    _crypto: string,
    _network: string,
  ): Promise<PayMethod[]> {
    throw new Error('Method not implemented.');
  }

  createPayment(
    _currency: string,
    _method: string,
    _amount: number,
  ): Promise<any> {
    throw new Error('Method not implemented.');
  }

  getPaymentStatus(_paymentId: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  getPaymentDetails(_paymentId: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  cancelPayment(_paymentId: string): Promise<any> {
    throw new Error('Method not implemented.');
  }

  estimatePrice(_request: PaymentRequest): Promise<EstimatePriceDto> {
    throw new Error('Method not implemented.');
  }

  getPayType(_request: PaymentRequest): Promise<PayType> {
    throw new Error('Method not implemented.');
  }

  /**
   * 获取配置
   */
  getConfig(): OnRamperPaymentConfig {
    return { ...this.config };
  }
}
