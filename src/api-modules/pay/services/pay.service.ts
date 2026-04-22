import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import {
  PaymentManager,
  PaymentMethodRequest,
  PaymentRequest,
} from '../onramp/PaymentManager';
import { PayMethodInfo, PayType } from '../type/PayMethod';
import { UserService } from 'src/api-modules/user/service/user.service';
import { AssetService } from 'src/api-modules/assets/services/asset.service';
import { FiatOrder, FiatOrderStatus } from '../entities/fiat-order.entity';
import {
  TKPaysPayment,
  TKPaysChannel,
} from '../onramp/tkpays/TKPaysPayment';
import { TKPaysCallbackData } from '../onramp/tkpays/type';
import { Currency } from 'src/api-modules/assets/entities/balance/user-asset.entity';
import { RedisService } from 'src/common-modules/redis/redis.service';

@Injectable()
export class PayService {
  private readonly logger = new Logger(PayService.name);
  private paymentManager: PaymentManager;
  private tkpaysPayment: TKPaysPayment;

  constructor(
    private readonly userService: UserService,
    private readonly assetService: AssetService,
    private readonly redisService: RedisService,
    @InjectRepository(FiatOrder)
    private readonly fiatOrderRepository: Repository<FiatOrder>,
  ) {
    this.paymentManager = new PaymentManager();
    this.tkpaysPayment = new TKPaysPayment({
      appid: process.env.TKPAYS_APPID || '',
      token: process.env.TKPAYS_TOKEN || '',
      baseUrl: process.env.TKPAYS_BASE_URL || 'https://api.tkpays.com',
    });
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
      callbackUrl:
        'https://yoho-api-service-dev-ff05bf602cab.herokuapp.com/api/v1/pay/webhook',
    });
    return payType;
  }

  /**
   * 创建法币入金订单 (TKPays)
   */
  async createFiatDeposit(
    uid: string,
    params: {
      fiatCurrency: string;
      amount: number;
      payType: string;
      successUrl?: string;
      errorUrl?: string;
    },
  ): Promise<{ order: FiatOrder; payUrl: string }> {
    const { fiatCurrency, amount, payType, successUrl, errorUrl } = params;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const currencyCode = fiatCurrency.toUpperCase();

    // 生成内部订单号
    const orderId = `FIAT_${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase()}`;

    // 创建内部订单 - 直接充入对应法币余额，不做汇率转换
    const order = this.fiatOrderRepository.create({
      orderId,
      uid,
      provider: 'tkpays',
      fiatCurrency: currencyCode,
      fiatAmount: String(amount),
      targetCurrency: currencyCode,
      payType,
      status: FiatOrderStatus.PENDING,
    });

    await this.fiatOrderRepository.save(order);

    // 构造回调 URL
    const baseUrl =
      process.env.API_BASE_URL ||
      'https://yoho-api-service-dev-ff05bf602cab.herokuapp.com';
    const callbackUrl = `${baseUrl}/api/v1/pay/tkpays/callback`;

    try {
      // 调用 TKPays 下单
      const result = await this.tkpaysPayment.unifiedOrder({
        payType,
        amount: String(amount),
        outTradeNo: orderId,
        outUid: uid,
        callbackUrl,
        successUrl: successUrl || `${baseUrl}/pay/success`,
        errorUrl: errorUrl || `${baseUrl}/pay/error`,
      });

      // 更新订单: 记录第三方订单号和支付链接
      order.providerOrderNo = result.data.order_no;
      order.payUrl = result.url;
      await this.fiatOrderRepository.save(order);

      return { order, payUrl: result.url };
    } catch (error) {
      order.status = FiatOrderStatus.FAILED;
      await this.fiatOrderRepository.save(order);
      this.logger.error(`TKPays order failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Payment order creation failed');
    }
  }

  /**
   * 处理 TKPays 回调
   */
  async handleTKPaysCallback(data: TKPaysCallbackData): Promise<boolean> {
    this.logger.log(`TKPays callback received: ${JSON.stringify(data)}`);

    // 验签
    if (!this.tkpaysPayment.verifyCallbackSign(data)) {
      this.logger.warn(
        `TKPays callback sign verification failed for order: ${data.out_trade_no}`,
      );
      throw new BadRequestException('Invalid signature');
    }

    const orderId = data.out_trade_no;

    // Redis 分布式锁防并发
    const lockKey = `fiat_callback:${orderId}`;
    const locked = await this.redisService.acquireLock(lockKey, 30);
    if (!locked) {
      this.logger.warn(`TKPays callback lock failed for order: ${orderId}`);
      return true; // 已在处理中，返回 success 避免重复回调
    }

    try {
      // 查找订单
      const order = await this.fiatOrderRepository.findOne({
        where: { orderId },
      });

      if (!order) {
        this.logger.warn(`TKPays callback: order not found: ${orderId}`);
        return false;
      }

      // 已处理过的订单直接返回成功
      if (order.status === FiatOrderStatus.SUCCESS) {
        return true;
      }

      // 记录回调数据
      order.callbackData = data;
      order.fiatAmountTrue = data.amount_true;

      if (data.callbacks === 'CODE_SUCCESS') {
        const actualAmount = new Decimal(data.amount_true);

        order.targetAmount = actualAmount.toFixed(8);
        order.status = FiatOrderStatus.SUCCESS;
        await this.fiatOrderRepository.save(order);

        // 直接充值到对应法币余额
        await this.assetService.deposit({
          userId: order.uid,
          currency: order.fiatCurrency as Currency,
          amount: actualAmount,
          reference_id: `tkpays_${orderId}`,
          description: `Fiat deposit via TKPays: ${data.amount_true} ${order.fiatCurrency}`,
          metadata: {
            provider: 'tkpays',
            fiatCurrency: order.fiatCurrency,
            fiatAmount: data.amount_true,
            providerOrderNo: order.providerOrderNo,
          },
        });

        this.logger.log(
          `TKPays deposit success: ${orderId}, ${actualAmount.toFixed(2)} ${order.fiatCurrency}`,
        );
      } else {
        order.status = FiatOrderStatus.FAILED;
        await this.fiatOrderRepository.save(order);
        this.logger.log(`TKPays payment failed: ${orderId}`);
      }

      return true;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * 查询用户法币入金订单
   */
  async getFiatOrders(
    uid: string,
    page = 1,
    limit = 20,
  ): Promise<{ orders: FiatOrder[]; total: number }> {
    const [orders, total] = await this.fiatOrderRepository.findAndCount({
      where: { uid },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { orders, total };
  }

  /**
   * 根据法币类型获取可用的支付渠道
   */
  getFiatChannels(currency: string): TKPaysChannel[] {
    return this.tkpaysPayment.getChannelsByCurrency(currency);
  }

  /**
   * 获取所有支持法币入金的货币列表
   */
  getSupportedFiatCurrencies(): string[] {
    return this.tkpaysPayment.getSupportedCurrencies();
  }

  /**
   * 主动查询 TKPays 订单状态
   */
  async queryTKPaysOrder(orderId: string) {
    return this.tkpaysPayment.queryOrder(orderId);
  }
}
