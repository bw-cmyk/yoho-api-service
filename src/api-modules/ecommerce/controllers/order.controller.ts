import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { OrderService } from '../services/order.service';
import {
  CreateInstantBuyOrderDto,
  CreateLuckyDrawOrderDto,
  QueryOrdersDto,
  RequestRefundDto,
} from '../dto/order.dto';

@ApiTags('订单管理')
@ApiBearerAuth()
@Controller('/api/v1/ecommerce/orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('instant-buy')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '创建 Instant Buy 订单' })
  async createInstantBuyOrder(
    @Request() req: ExpressRequest,
    @Body() dto: CreateInstantBuyOrderDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.orderService.createInstantBuyOrder(userId, dto);
  }

  // @Post('lucky-draw')
  // @UseGuards(JwtAuthGuard)
  // @ApiOperation({ summary: '创建 Lucky Draw 订单' })
  // async createLuckyDrawOrder(
  //   @Request() req: ExpressRequest,
  //   @Body() dto: CreateLuckyDrawOrderDto,
  // ) {
  //   const { id: userId } = req.user as any;
  //   return await this.orderService.createLuckyDrawOrder(userId, dto);
  // }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取我的订单列表' })
  async getMyOrders(
    @Request() req: ExpressRequest,
    @Query() query: QueryOrdersDto,
  ) {
    const { id: userId } = req.user as any;
    return await this.orderService.getUserOrders(userId, query);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '获取订单详情' })
  async getOrderDetail(
    @Request() req: ExpressRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { id: userId } = req.user as any;
    return await this.orderService.getOrderDetail(id, userId);
  }

  @Post(':id/refund')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: '申请退款' })
  async requestRefund(
    @Request() req: ExpressRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const { id: userId } = req.user as any;
    return await this.orderService.requestRefund(id, userId);
  }
}
