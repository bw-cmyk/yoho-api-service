import { PayMethod, PayType } from '../type/PayMethod';
import { EstimatePriceDto } from '../type/EstimatePriceDto';
import { PaymentRequest } from './PaymentManager';

export abstract class BasePayment {
  abstract getCurrencies(): Promise<string[]>;
  abstract getPaymentMethods(
    currency: string,
    crypto: string,
    network: string,
  ): Promise<PayMethod[]>;
  // abstract getPaymentMethodDetails(currency: string, method: string): Promise<any>;
  abstract createPayment(
    currency: string,
    method: string,
    amount: number,
  ): Promise<any>;
  abstract getPaymentStatus(paymentId: string): Promise<any>;
  abstract getPaymentDetails(paymentId: string): Promise<any>;
  abstract cancelPayment(paymentId: string): Promise<any>;
  abstract estimatePrice(request: PaymentRequest): Promise<EstimatePriceDto>;
  abstract getPayType(request: PaymentRequest): Promise<PayType>;
}
