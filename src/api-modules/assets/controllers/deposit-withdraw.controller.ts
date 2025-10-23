import {
  Controller,
  Request,
  Post,
  Get,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { DepositWithdrawService } from '../services/deposit-withdraw.service';
import { getAddress } from 'ethers';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('BingOx')
@Controller('api/v1/deposit-withdraw/')
export class DepositWithdrawController {
  constructor(private readonly paymentService: DepositWithdrawService) {}

  @ApiResponse({
    status: 200,
    description: 'deposit',
  })
  @UseGuards(JwtAuthGuard)
  @Post('/deposit')
  async paymentDepositSignature(@Request() req: ExpressRequest) {
    const { wallet } = req.user as any;
    const { amount, chainId, type, customerOrderId, notifyUrl } = req.body;
    return await this.paymentService.getTopUpSignature(
      amount,
      wallet,
      chainId,
      type,
      customerOrderId,
      notifyUrl,
    );
  }

  @ApiResponse({
    status: 200,
    description: 'withdraw',
  })
  @UseGuards(JwtAuthGuard)
  @Post('/withdraw')
  async getWithDrawSignature(@Request() req: ExpressRequest) {
    const { wallet } = req.user as any;
    const { amount, chainId, type, customerOrderId, notifyUrl } = req.body;

    return await this.paymentService.getWithDrawSignature(
      amount,
      wallet,
      chainId,
      type,
      customerOrderId,
      notifyUrl,
    );
  }

  @ApiResponse({
    status: 200,
    description: 'payment',
  })
  @UseGuards(JwtAuthGuard)
  @Get('/orders')
  async getOrderStatus(@Request() req: ExpressRequest) {
    const { wallet } = req.user as any;
    const { limit, offset } = req.query;
    return await this.paymentService.getOrders(
      wallet,
      Number(limit),
      Number(offset),
    );
  }
}
