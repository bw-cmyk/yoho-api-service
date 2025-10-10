import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AssetService } from '../services/asset.service';
import { Currency } from '../entities/user-asset.entity';
import { TransactionType } from '../entities/transaction.entity';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';

@ApiTags('资产管理')
@Controller('/api/v1/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get('chain-assets')
  async getUserChainAssets(@Request() req: ExpressRequest) {
    const userId = req.query.userId;
    console.log('userId', userId);
    const assets = await this.assetService.updateUserChainAssets(
      userId as string,
    );
    return {
      user_id: userId,
    };
  }

  @Get('/all')
  @ApiOperation({ summary: '获取用户资产' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @UseGuards(JwtAuthGuard)
  async getUserAssets(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    const assets = await this.assetService.getUserAssets(userId);
    const onchainAssets = await this.assetService.getUserChainAssets(userId);
    return {
      user_id: userId,
      assets: assets.map((asset) => ({
        currency: asset.currency,
        ...asset.getBalanceDetails(),
      })),
      onchainAssets: onchainAssets.map((asset) => ({
        tokenSymbol: asset.tokenSymbol,
        ...asset.getAssetDetails(),
      })),
    };
  }

  @Get(':userId/:currency')
  @ApiOperation({ summary: '获取用户指定币种资产' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserAsset(
    @Param('userId', ParseIntPipe) userId: string,
    @Param('currency') currency: Currency,
  ) {
    const asset = await this.assetService.getUserAsset(userId, currency);
    return {
      user_id: userId,
      currency: asset.currency,
      ...asset.getBalanceDetails(),
    };
  }

  @Get(':userId/transactions')
  @ApiOperation({ summary: '获取用户交易历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTransactionHistory(
    @Param('userId') userId: string,
    @Query('currency') currency?: Currency,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const result = await this.assetService.getTransactionHistory(
      userId,
      currency,
      parseInt(page),
      parseInt(limit),
    );

    return {
      user_id: userId,
      currency,
      page: parseInt(page),
      limit: parseInt(limit),
      total: result.total,
      transactions: result.transactions.map((t) => t.getSummary()),
    };
  }

  @Get('transactions/types')
  @ApiOperation({ summary: '获取交易类型列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTransactionTypes() {
    return {
      types: Object.values(TransactionType),
    };
  }
}
