import {
  Controller,
  Request,
  Post,
  Get,
  BadRequestException,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { DepositWithdrawService } from '../services/deposit-withdraw.service';
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
    const { id: uid } = req.user as any;
    const { amount, chainId, type, customerOrderId, notifyUrl } = req.body;
    return await this.paymentService.getTopUpSignature(
      amount,
      uid,
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
    const { id: uid } = req.user as any;
    const { amount, chainId, type, customerOrderId, notifyUrl } = req.body;

    return await this.paymentService.getWithDrawSignature(
      amount,
      uid,
      chainId,
      type,
      customerOrderId,
      notifyUrl,
    );
  }

  /**
   * @deprecated Use /api/v1/admin/withdraws/:orderId/approve instead
   * This endpoint is kept for backwards compatibility but requires admin role
   */
  @ApiResponse({ status: 200, description: 'approve withdraw' })
  @UseGuards(JwtAuthGuard)
  @Post('/withdraw/approve')
  async approveWithdraw(@Request() req: ExpressRequest) {
    const user = req.user as any;
    // Security: Check if user has admin role (Role.INNER = 1000)
    if (user.role !== 1000) {
      throw new ForbiddenException(
        'Admin access required. Use /api/v1/admin/withdraws/:orderId/approve',
      );
    }
    const { orderId } = req.body as any;
    return await this.paymentService.approveWithdraw(Number(orderId));
  }

  /**
   * @deprecated Use /api/v1/admin/withdraws/:orderId/reject instead
   * This endpoint is kept for backwards compatibility but requires admin role
   */
  @ApiResponse({ status: 200, description: 'reject withdraw' })
  @UseGuards(JwtAuthGuard)
  @Post('/withdraw/reject')
  async rejectWithdraw(@Request() req: ExpressRequest) {
    const user = req.user as any;
    // Security: Check if user has admin role (Role.INNER = 1000)
    if (user.role !== 1000) {
      throw new ForbiddenException(
        'Admin access required. Use /api/v1/admin/withdraws/:orderId/reject',
      );
    }
    const { orderId } = req.body as any;
    return await this.paymentService.rejectWithdraw(Number(orderId));
  }

  @ApiResponse({
    status: 200,
    description: 'payment',
  })
  @UseGuards(JwtAuthGuard)
  @Get('/orders')
  async getOrderStatus(@Request() req: ExpressRequest) {
    const { uid } = req.user as any;
    const { limit, offset } = req.query;
    return await this.paymentService.getOrders(
      uid,
      Number(limit),
      Number(offset),
    );
  }
}
