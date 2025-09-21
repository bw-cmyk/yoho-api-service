import * as crypto from 'crypto';
import { BasePayment } from '../BasePayment';
import {
  AlchemyPaymentConfig,
  AlchemyPaymentResponse,
  AlchemyPaymentStatus,
  GetTokenRequest,
  GetTokenResponse,
  RequestOptions,
  QueryCryptoFiatMethodRequest,
  QueryCryptoFiatMethodResponse,
  FiatListRequest,
  FiatListResponse,
  PaymentMethodFormRequest,
  PaymentMethodFormResponse,
  OrderQuotedRequest,
  OrderQuotedResponse,
} from './type';
import { generatePaymentId, getJsonBody, getPath } from './utils';
import { PaymentRequest } from '../PaymentManager';
import { EstimatePriceDto } from '../../type/EstimatePriceDto';
import { PayMethod, PayMethodMap, PayType } from '../../type/PayMethod';

const AlchemyPaymentMethods = [
  {
    name: ' Visa/Master Card',
    code: '10001',
    type: PayMethod.CREDIT_CARD,
  },
  {
    name: 'Apple Pay',
    code: '501',
    type: PayMethod.APPLE_PAY,
  },
  {
    name: 'Google Pay',
    code: '701',
    type: PayMethod.GOOGLE_PAY,
  },
];

export class AlchemyPayment extends BasePayment {
  private readonly config: AlchemyPaymentConfig;

  constructor(config: AlchemyPaymentConfig) {
    super();
    this.config = config;
  }

  /**
   * 通用请求方法，自动处理签名和请求
   */
  private async request<T>(options: RequestOptions): Promise<T> {
    const { method, path, data, headers = {} } = options;
    const timestamp = Date.now();
    const bodyString = data ? JSON.stringify(data) : '';

    // 生成签名
    const signature = this.generateSignature(
      timestamp,
      method,
      path,
      bodyString,
    );

    // 构建请求头
    const requestHeaders = {
      'Content-Type': 'application/json',
      appid: this.config.appId,
      timestamp: timestamp.toString(),
      sign: signature,
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
        throw new Error(`HTTP error! status: ${response.status}`);
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

  /**
   * 查询支持的支付方式（基于法币和加密货币）
   * @param request 查询请求参数
   * @returns 支持的支付方式列表
   */
  public async queryCryptoFiatMethod(
    request: QueryCryptoFiatMethodRequest,
  ): Promise<QueryCryptoFiatMethodResponse> {
    try {
      const response = await this.request<QueryCryptoFiatMethodResponse>({
        method: 'POST',
        path: '/open/api/v4/merchant/query/cryptoFiatMethod',
        data: request,
      });

      return response;
    } catch (error) {
      console.error('Failed to query crypto fiat method:', error);
      throw new Error('Failed to query crypto fiat method');
    }
  }

  /**
   * 查询支持的法币货币列表
   * @param request 查询请求参数，包含 type（BUY/SELL）
   * @returns 支持的法币货币列表
   */
  public async getFiatList(
    request: FiatListRequest = {},
  ): Promise<FiatListResponse> {
    try {
      const { type = 'BUY' } = request;
      const path = `/open/api/v4/merchant/fiat/list?type=${type}`;

      const response = await this.request<FiatListResponse>({
        method: 'GET',
        path,
      });

      return response;
    } catch (error) {
      console.error('Failed to get fiat list:', error);
      throw new Error('Failed to get fiat list');
    }
  }

  /**
   * 查询支付方式表单字段
   * @param request 查询请求参数，包含 payWayCode、fiat、side
   * @returns 支付方式表单字段信息
   */
  public async getPaymentMethodForm(
    request: PaymentMethodFormRequest,
  ): Promise<PaymentMethodFormResponse> {
    try {
      const { payWayCode, fiat, side } = request;
      const path = `/open/api/v4/merchant/payment/requiredField?payWayCode=${payWayCode}&fiat=${fiat}&side=${side}`;

      const response = await this.request<PaymentMethodFormResponse>({
        method: 'GET',
        path,
      });

      return response;
    } catch (error) {
      console.error('Failed to get payment method form:', error);
      throw new Error('Failed to get payment method form');
    }
  }

  /**
   * 获取订单报价结果
   * @param request 报价请求参数
   * @returns 订单报价结果
   */
  public async getOrderQuotedResult(
    request: OrderQuotedRequest,
  ): Promise<OrderQuotedResponse> {
    try {
      const response = await this.request<OrderQuotedResponse>({
        method: 'POST',
        path: '/open/api/v4/merchant/order/quoted/result',
        data: request,
      });

      return response;
    } catch (error) {
      console.error('Failed to get order quoted result:', error);
      throw new Error('Failed to get order quoted result');
    }
  }

  /**
   * 获取支持的支付方式
   * @deprecated 建议使用 queryCryptoFiatMethod 方法获取更详细的支付方式信息
   */
  public async getPaymentMethods(
    currency: string,
    crypto: string,
    network: string,
  ): Promise<PayMethod[]> {
    try {
      // 使用真实的 API 调用获取支付方式
      const response = await this.queryCryptoFiatMethod({
        fiat: currency.toUpperCase(),
        crypto: crypto,
        network: network || 'BSC',
        side: 'BUY',
      });

      if (response.success && response.data) {
        // 提取支付方式代码
        return response.data.map((item) => {
          const type = AlchemyPaymentMethods.find(
            (method) => method.code === item.payWayCode,
          );
          const payMethodInfo = PayMethodMap[type.type];

          if (payMethodInfo) {
            return payMethodInfo.code;
          }

          return null;
        });
      }
    } catch (error) {
      console.error('Failed to get payment methods:', error);
      // 返回默认支持的支付方式作为后备
      return [];
    }
  }

  async estimatePrice(request: PaymentRequest): Promise<EstimatePriceDto> {
    try {
      // 构建 OrderQuotedRequest
      const quotedRequest: OrderQuotedRequest = {
        side: 'BUY', // 默认使用 BUY
        fiatCurrency: request.currency,
        cryptoCurrency: request.crypto,
        network: request.network,
        fiatAmount: request.amount?.toString(), // 如果有金额的话
      };
      console.log('quotedRequest', quotedRequest);
      // 调用 Alchemy API 获取报价
      const response = await this.request<OrderQuotedResponse>({
        method: 'POST',
        path: '/open/api/v4/merchant/order/quoted/result',
        data: quotedRequest,
      });

      if (!response.success) {
        throw new Error(
          `API Error: ${response.returnMsg} (${response.returnCode})`,
        );
      }

      // 转换为 EstimatePriceDto 格式
      const estimatePrice: EstimatePriceDto = {
        cryptoPrice: response.data.cryptoPrice,
        currencyAmount: response.data.fiatAmount,
        cryptoQuantity: response.data.cryptoQuantity,
        rampFee: response.data.rampFee,
        networkFee: response.data.networkFee,
        payment: this, // 返回当前实例
      };

      return estimatePrice;
    } catch (error) {
      console.error('Failed to estimate price:', error);
      throw new Error(
        `Failed to estimate price: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  async getPayType(request: PaymentRequest): Promise<PayType> {
    try {
      // 生成时间戳
      const timestamp = Date.now().toString();

      // 构建请求参数（按字典序排序）
      const params: Record<string, string> = {
        appId: this.config.appId,
        crypto: request.crypto,
        fiat: request.currency,
        fiatAmount: request.amount.toString(),
        network: request.network,
        timestamp: timestamp,
      };

      // 如果有 merchantOrderNo，添加到参数中
      if (request.merchantOrderNo) {
        params.merchantOrderNo = request.merchantOrderNo;
      }
      params.merchantOrderNo = 'test' + timestamp;
      if (request.address) {
        params.address = request.address;
      }
      if (request.callbackUrl) {
        params.callbackUrl = request.callbackUrl;
      }
      if (request.redirectUrl) {
        params.redirectUrl = request.redirectUrl;
      }
      params.email = 'boelroy@live.com';
      const token = await this.getToken({ email: params.email });
      params.token = token;

      // 生成签名字符串
      const signatureString = this.generateRampSignature(
        timestamp,
        'GET',
        '/index/rampPageBuy',
        params,
      );

      // 构建最终 URL
      const queryParams = new URLSearchParams();
      Object.keys(params)
        .sort()
        .forEach((key) => {
          queryParams.append(key, params[key]);
        });
      queryParams.append('sign', signatureString);

      const endpoint =
        process.env.ALCHEMY_PAGE_BASE_URL || 'https://ramptest.alchemypay.org';
      const url = `${endpoint}?${queryParams.toString()}`;

      return {
        type: 'external',
        url: url,
      };
    } catch (error) {
      console.error('Failed to generate pay type URL:', error);
      throw new Error('Failed to generate pay type URL');
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
      const requestBody = {
        currency: currency.toUpperCase(),
        method,
        amount: amount.toString(),
        timestamp: Date.now(),
      };

      // 使用通用请求方法
      const response = await this.request<AlchemyPaymentResponse>({
        method: 'POST',
        path: '/api/v1/payments',
        data: requestBody,
      });

      return response;
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
      // 使用通用请求方法
      const response = await this.request<AlchemyPaymentStatus>({
        method: 'GET',
        path: `/api/v1/payments/${paymentId}`,
      });

      return response;
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
      // 使用通用请求方法
      const response = await this.request<AlchemyPaymentResponse>({
        method: 'GET',
        path: `/api/v1/payments/${paymentId}/details`,
      });

      return response;
    } catch (error) {
      console.error('Failed to get payment details:', error);
      throw new Error('Failed to get payment details');
    }
  }

  /**
   * 取消支付
   */
  async cancelPayment(
    paymentId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // 使用通用请求方法
      const response = await this.request<{
        success: boolean;
        message: string;
      }>({
        method: 'POST',
        path: `/api/v1/payments/${paymentId}/cancel`,
      });

      return response;
    } catch (error) {
      console.error('Failed to cancel payment:', error);
      throw new Error('Failed to cancel payment');
    }
  }

  /**
   * 获取支持的货币
   */
  async getCurrencies(): Promise<string[]> {
    return [];
  }

  /**
   * 获取用户访问令牌
   * @param request 请求参数，包含 email 或 uid
   * @returns 访问令牌响应
   */
  public async getToken(request: GetTokenRequest): Promise<string> {
    if (!request.email && !request.uid) {
      throw new Error('Email or uid is required');
    }

    try {
      // 构建请求体
      const requestBody: Record<string, string> = {};
      if (request.email) {
        requestBody.email = request.email;
      }
      // if (request.uid) {
      //   requestBody.uid = request.uid;
      // }

      // 使用通用请求方法
      const response = await this.request<GetTokenResponse>({
        method: 'POST',
        path: '/open/api/v4/merchant/getToken',
        data: requestBody,
      });

      return response.data.accessToken;
    } catch (error) {
      console.error('Failed to get token:', error);
      throw new Error('Failed to get token');
    }
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
      getPath(requestUrl, this.config.baseUrl) +
      getJsonBody(body);

    const signVal = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(content, 'utf8')
      .digest('base64');

    return signVal;
  }

  /**
   * 生成 Ramp 页面签名
   * 根据 Alchemy Pay Ramp 签名规则生成签名
   */
  private generateRampSignature(
    timestamp: string,
    httpMethod: string,
    requestPath: string,
    params: Record<string, string>,
  ): string {
    console.log('params', params);
    // 按字典序排序参数并生成查询字符串
    const sortedKeys = Object.keys(params).sort();
    const queryString = sortedKeys
      .map((key) => {
        const value = params[key];
        // 过滤空值和数组
        if (Array.isArray(value) || value === '') {
          return null;
        }
        return `${key}=${value}`;
      })
      .filter(Boolean)
      .join('&');

    // 构建签名字符串：timestamp + httpMethod + requestPath + queryString
    const signatureString =
      timestamp + httpMethod + requestPath + '?' + queryString;

    console.log('signatureString:' + signatureString);
    // 使用 HMAC SHA256 生成签名
    const hmac = crypto.createHmac('sha256', this.config.secretKey);
    hmac.update(signatureString);
    const signature = hmac.digest('base64');

    return signature;
  }

  /**
   * 获取配置
   */
  getConfig(): AlchemyPaymentConfig {
    return { ...this.config };
  }
}
