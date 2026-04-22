import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
  Body,
  Res,
  Logger,
} from '@nestjs/common';
import { PayService } from '../services/pay.service';
import { PaymentMethodRequest, PaymentRequest } from '../onramp/PaymentManager';
import { JwtAuthGuard } from '../../../common-modules/auth/jwt-auth.guard';
import { Request as ExpressRequest, Response } from 'express';

@Controller('/api/v1/pay')
export class PayController {
  private readonly logger = new Logger(PayController.name);

  constructor(private readonly payService: PayService) {}

  @Get('/methods')
  @UseGuards(JwtAuthGuard)
  async getPayMethods(@Query() query: PaymentMethodRequest) {
    return this.payService.getPayMethods(query);
  }

  @Post('/best-channel')
  @UseGuards(JwtAuthGuard)
  async getBestPaymentChannel(
    @Body() query: PaymentRequest,
    @Req() req: ExpressRequest,
  ) {
    const { id: uid } = req.user as any;
    return this.payService.getBestPaymentChannel(uid, query);
  }

  @Post('/webhook')
  async handleWebhook(@Req() req: ExpressRequest) {
    console.log('Webhook received:', req.body);
    return {
      success: true,
    };
  }

  /**
   * 获取法币入金支持的货币列表
   */
  @Get('/fiat/currencies')
  @UseGuards(JwtAuthGuard)
  getSupportedFiatCurrencies() {
    return this.payService.getSupportedFiatCurrencies();
  }

  /**
   * 根据法币类型获取可用支付渠道
   */
  @Get('/fiat/channels')
  @UseGuards(JwtAuthGuard)
  getFiatChannels(@Query('currency') currency: string) {
    return this.payService.getFiatChannels(currency);
  }

  /**
   * 法币入金 - 创建订单
   */
  @Post('/fiat/deposit')
  @UseGuards(JwtAuthGuard)
  async createFiatDeposit(
    @Body()
    body: {
      fiatCurrency: string;
      amount: number;
      payType: string;
      successUrl?: string;
      errorUrl?: string;
    },
    @Req() req: ExpressRequest,
  ) {
    const { id: uid } = req.user as any;
    const result = await this.payService.createFiatDeposit(uid, body);
    return {
      orderId: result.order.orderId,
      payUrl: result.payUrl,
      fiatCurrency: result.order.fiatCurrency,
      fiatAmount: result.order.fiatAmount,
      targetCurrency: result.order.targetCurrency,
      targetAmount: result.order.targetAmount,
      exchangeRate: result.order.exchangeRate,
    };
  }

  /**
   * 法币入金 - 查询订单列表
   */
  @Get('/fiat/orders')
  @UseGuards(JwtAuthGuard)
  async getFiatOrders(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Req() req: ExpressRequest,
  ) {
    const { id: uid } = req.user as any;
    return this.payService.getFiatOrders(
      uid,
      parseInt(page) || 1,
      parseInt(limit) || 20,
    );
  }

  /**
   * TKPays 支付回调
   */
  @Post('/tkpays/callback')
  async handleTKPaysCallback(
    @Body() body: any,
    @Res() res: Response,
  ) {
    this.logger.log(`TKPays callback body: ${JSON.stringify(body)}`);

    try {
      const success = await this.payService.handleTKPaysCallback(body);
      if (success) {
        // TKPays 要求返回 'success' 字符串
        res.status(200).send('success');
      } else {
        res.status(400).send('fail');
      }
    } catch (error) {
      this.logger.error(`TKPays callback error: ${error.message}`, error.stack);
      res.status(400).send('fail');
    }
  }
}
