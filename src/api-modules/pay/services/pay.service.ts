import { Injectable } from '@nestjs/common';
import {
  PaymentManager,
  PaymentMethodRequest,
  PaymentRequest,
} from '../onramp/PaymentManager';
import { PayMethodInfo, PayType } from '../type/PayMethod';
import { UserService } from 'src/api-modules/user/service/user.service';

@Injectable()
export class PayService {
  private paymentManager: PaymentManager;

  constructor(private readonly userService: UserService) {
    this.paymentManager = new PaymentManager();
  }

  async getPayMethods(request: PaymentMethodRequest): Promise<PayMethodInfo[]> {
    return this.paymentManager.getPayMethods(request);
  }

  async getBestPaymentChannel(
    uid: string,
    request: PaymentRequest,
  ): Promise<PayType> {
    const bestPaymentChannel = await this.paymentManager.getBestPaymentChannel(
      request,
    );
    const user = await this.userService.getUser(uid);
    request.address = user.evmAAWallet;
    const payType = await bestPaymentChannel.getPayType({
      ...request,
      address: user.evmAAWallet,
      uid: uid,
      callbackUrl: 'https://yoho-api-service-dev-ff05bf602cab.herokuapp.com/api/v1/pay/webhook',
    });
    return payType;
  }
}
