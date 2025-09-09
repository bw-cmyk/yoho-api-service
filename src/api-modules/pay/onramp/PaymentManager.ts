import { AlchemyPayment } from './alchemy/AlchemyPayment';
import { BasePayment } from './BasePayment';
import { EstimatePriceDto } from '../type/EstimatePriceDto';
import {
  PayMethod,
  PayMethodInfo,
  PayMethodMap,
  PayType,
} from '../type/PayMethod';

export interface PaymentMethodRequest {
  crypto: string;
  network: string;
  currency: string;
}

export interface PaymentRequest {
  crypto: string;
  network: string;
  currency: string;
  amount: number;
  payMethod: PayMethod;
  address?: string;
  callbackUrl?: string;
  redirectUrl?: string;
  uid?: string;
  merchantOrderNo?: string; // 商户订单号，用于 Ramp 签名
}

export class PaymentManager {
  private readonly paymentServices: BasePayment[];
  constructor() {
    this.paymentServices = [
      new AlchemyPayment({
        appId: process.env.ALCHEMY_APP_ID || 'f83Is2y7L425rxl8',
        secretKey: process.env.ALCHEMY_SECRET_KEY || '5Zp9SmtLWQ4Fh2a1',
        baseUrl:
          process.env.ALCHEMY_BASE_URL || 'https://openapi-test.alchemypay.org',
      }),
    ];
  }

  public async getPayMethods(
    request: PaymentMethodRequest,
  ): Promise<PayMethodInfo[]> {
    const payMethods: PayMethodInfo[] = [];
    for (const paymentService of this.paymentServices) {
      const paymentMethods = await paymentService.getPaymentMethods(
        request.currency,
        request.crypto,
        request.network,
      );
      payMethods.push(...paymentMethods.map((method) => PayMethodMap[method]));
    }
    return payMethods;
  }

  // 获取最优的支付方式
  public async getBestPaymentChannel(
    request: PaymentRequest,
  ): Promise<BasePayment> {
    const results: EstimatePriceDto[] = await Promise.all(
      this.paymentServices.map(async (paymentService) => {
        const paymentMethods = await paymentService.estimatePrice(request);
        return paymentMethods;
      }),
    );

    // 找到最优的支付方式
    const bestPaymentMethod = results.sort(
      (a, b) => Number(a.cryptoQuantity) - Number(b.cryptoQuantity),
    )[0];
    return bestPaymentMethod.payment;
  }

  public async getPayType(
    request: PaymentRequest,
    paymentService: BasePayment,
  ): Promise<PayType> {
    return paymentService.getPayType(request);
  }
}
