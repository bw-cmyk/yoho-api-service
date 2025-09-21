import {
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { PayService } from '../services/pay.service';
import { PaymentMethodRequest, PaymentRequest } from '../onramp/PaymentManager';
import { JwtAuthGuard } from '../../../common-modules/auth/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';

@Controller('/api/v1/pay')
export class PayController {
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
    // log the body for debugging
    console.log('Webhook received:', req.body);
    return {
      success: true,
    };
  }
}
