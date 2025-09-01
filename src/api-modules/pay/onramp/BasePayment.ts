export abstract class BasePayment {
  abstract getCurrencies(): Promise<string[]>;
  abstract getPaymentMethods(currency: string): Promise<string[]>;
  // abstract getPaymentMethodDetails(currency: string, method: string): Promise<any>;
  abstract createPayment(
    currency: string,
    method: string,
    amount: number,
  ): Promise<any>;
  abstract getPaymentStatus(paymentId: string): Promise<any>;
  abstract getPaymentDetails(paymentId: string): Promise<any>;
  abstract cancelPayment(paymentId: string): Promise<any>;
}
