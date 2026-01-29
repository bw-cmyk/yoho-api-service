import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AdminAssetService } from '../services/admin-asset.service';
import { AdminJwtGuard } from '../guards/admin-jwt.guard';

@ApiTags('Admin - 提现管理')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('api/v1/admin/withdraws')
export class AdminWithdrawController {
  constructor(private readonly adminAssetService: AdminAssetService) {}

  @Get()
  @ApiOperation({ summary: '获取提现订单列表' })
  getWithdrawOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.adminAssetService.getWithdrawOrders(
      parseInt(page) || 1,
      parseInt(limit) || 20,
      status,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: '获取提现统计' })
  getWithdrawStats() {
    return this.adminAssetService.getWithdrawStats();
  }

  @Post(':orderId/approve')
  @ApiOperation({ summary: '审核通过提现' })
  approveWithdraw(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req: ExpressRequest,
  ) {
    const adminUser = req.user as any;
    return this.adminAssetService.approveWithdraw(orderId, adminUser.sub);
  }

  @Post(':orderId/reject')
  @ApiOperation({ summary: '拒绝提现' })
  rejectWithdraw(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Request() req: ExpressRequest,
    @Body('reason') reason?: string,
  ) {
    const adminUser = req.user as any;
    return this.adminAssetService.rejectWithdraw(orderId, adminUser.sub, reason);
  }
}
