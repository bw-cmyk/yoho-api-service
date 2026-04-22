import * as crypto from 'crypto';
import axios from 'axios';
import { BasePayment } from '../BasePayment';
import { PayMethod, PayType } from '../../type/PayMethod';
import { EstimatePriceDto } from '../../type/EstimatePriceDto';
import { PaymentRequest } from '../PaymentManager';
import {
  TKPaysConfig,
  TKPaysUnifiedOrderResponse,
  TKPaysQueryOrderResponse,
  TKPaysCallbackData,
} from './type';
import { Logger } from '@nestjs/common';

// 法币 → 可用支付渠道映射
const CURRENCY_PAY_TYPES: Record<string, { code: string; name: string }[]> = {
  AED: [{ code: 'Botim', name: 'Botim' }],
};

export interface TKPaysChannel {
  code: string;
  name: string;
}

export class TKPaysPayment extends BasePayment {
  private readonly config: TKPaysConfig;
  private readonly logger = new Logger(TKPaysPayment.name);

  constructor(config: TKPaysConfig) {
    super();
    this.config = config;
  }

  /**
   * 根据法币类型获取可用支付渠道
   */
  getChannelsByCurrency(currency: string): TKPaysChannel[] {
    return CURRENCY_PAY_TYPES[currency.toUpperCase()] || [];
  }

  /**
   * 获取所有支持的法币列表
   */
  getSupportedCurrencies(): string[] {
    return Object.keys(CURRENCY_PAY_TYPES);
  }

  /**
   * 生成签名（大写 MD5）- 用于下单接口
   */
  makeSign(data: Record<string, string>): string {
    // 去空值
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== '' && value !== null && value !== undefined) {
        filtered[key] = value;
      }
    }

    // 按 key ASCII 字典序排序
    const sortedKeys = Object.keys(filtered).sort();
    const stringA = sortedKeys
      .map((key) => `${key}=${filtered[key]}`)
      .join('&');

    // 拼接商户密钥
    const stringSignTemp = `${stringA}&key=${this.config.token}`;

    this.logger.debug(`TKPays sign stringA: ${stringA}`);
    this.logger.debug(`TKPays sign stringSignTemp: ${stringSignTemp}`);

    // MD5 加密并转大写
    return crypto
      .createHash('md5')
      .update(stringSignTemp)
      .digest('hex')
      .toUpperCase();
  }

  /**
   * 生成签名（小写 MD5）- 用于查询接口
   */
  makeSignLower(data: Record<string, string>): string {
    const filtered: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== '' && value !== null && value !== undefined) {
        filtered[key] = value;
      }
    }

    const sortedKeys = Object.keys(filtered).sort();
    const stringA = sortedKeys
      .map((key) => `${key}=${filtered[key]}`)
      .join('&');

    const stringSignTemp = `${stringA}&key=${this.config.token}`;

    return crypto
      .createHash('md5')
      .update(stringSignTemp)
      .digest('hex')
      .toLowerCase();
  }

  /**
   * 验证回调签名
   */
  verifyCallbackSign(data: TKPaysCallbackData): boolean {
    const { sign, ...rest } = data;
    const calculated = this.makeSign(rest as Record<string, string>);
    return calculated === sign;
  }

  /**
   * 统一下单（获取 JSON 数据）
   */
  async unifiedOrder(params: {
    payType: string;
    amount: string;
    outTradeNo: string;
    outUid: string;
    callbackUrl: string;
    successUrl: string;
    errorUrl: string;
  }): Promise<TKPaysUnifiedOrderResponse> {
    const data: Record<string, string> = {
      appid: this.config.appid,
      pay_type: params.payType,
      amount: parseFloat(params.amount).toFixed(2),
      callback_url: params.callbackUrl,
      success_url: params.successUrl,
      error_url: params.errorUrl,
      out_trade_no: params.outTradeNo,
      out_uid: params.outUid,
      version: 'v1.2',
    };

    data.sign = this.makeSign(data);

    const url = `${this.config.baseUrl}/index/unifiedorder?format=json`;

    this.logger.log(`TKPays unifiedOrder request data: ${JSON.stringify(data)}`);

    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value);
    }

    const response = await axios.post<TKPaysUnifiedOrderResponse>(
      url,
      formData,
      { timeout: 15000 },
    );

    this.logger.log(
      `TKPays unifiedOrder response: ${JSON.stringify(response.data)}`,
    );

    if (response.data.code !== 200) {
      throw new Error(
        `TKPays order failed: [${response.data.code}] ${response.data.msg}`,
      );
    }

    return response.data;
  }

  /**
   * 查询订单
   */
  async queryOrder(outTradeNo: string): Promise<TKPaysQueryOrderResponse> {
    const data: Record<string, string> = {
      appid: this.config.appid,
      out_trade_no: outTradeNo,
    };

    // 查询接口签名为小写
    data.sign = this.makeSignLower(data);

    const url = `${this.config.baseUrl}/index/getorder`;

    const formData = new FormData();
    for (const [key, value] of Object.entries(data)) {
      formData.append(key, value);
    }

    const response = await axios.post<TKPaysQueryOrderResponse>(
      url,
      formData,
      { timeout: 15000 },
    );

    return response.data;
  }

  // ===== BasePayment 抽象方法实现 =====

  async getCurrencies(): Promise<string[]> {
    return this.getSupportedCurrencies();
  }

  async getPaymentMethods(): Promise<PayMethod[]> {
    return [PayMethod.BANK_TRANSFER];
  }

  async createPayment(
    currency: string,
    method: string,
    amount: number,
  ): Promise<any> {
    throw new Error('Use unifiedOrder() directly for TKPays');
  }

  async getPaymentStatus(paymentId: string): Promise<any> {
    return this.queryOrder(paymentId);
  }

  async getPaymentDetails(paymentId: string): Promise<any> {
    return this.queryOrder(paymentId);
  }

  async cancelPayment(paymentId: string): Promise<any> {
    throw new Error('TKPays does not support cancel');
  }

  async estimatePrice(request: PaymentRequest): Promise<EstimatePriceDto> {
    // TKPays 是法币直充，不涉及 crypto 价格估算
    // 返回基于系统汇率的估算
    return {
      cryptoPrice: '1',
      currencyAmount: String(request.amount),
      cryptoQuantity: String(request.amount),
      rampFee: '0',
      networkFee: '0',
      payment: this,
    };
  }

  async getPayType(request: PaymentRequest): Promise<PayType> {
    // TKPays 使用外部跳转支付页
    return {
      type: 'external',
      url: `${this.config.baseUrl}/index/unifiedorder`,
    };
  }
}
