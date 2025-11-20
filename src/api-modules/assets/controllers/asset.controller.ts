import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { AssetService } from '../services/asset.service';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { TransactionHistoryService } from '../services/transaction-history.service';

@ApiTags('资产管理')
@Controller('/api/v1/assets')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {}

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
    // get yesterday's snapshot
    const yesterdaySnapshot = await this.assetService.getUserAssetSnapshots(
      userId,
      new Date(Date.now() - 24 * 60 * 60 * 1000),
    );
    console.log('yesterdaySnapshot', yesterdaySnapshot);
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
      yesterdayAssets: yesterdaySnapshot,
    };
  }

  // get balance history
  @Get('/balance-history')
  @UseGuards(JwtAuthGuard)
  async getBalanceHistory(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    const balanceHistory = await this.assetService.getTransactionHistory(
      userId,
    );
    return {
      user_id: userId,
      balanceHistory: balanceHistory,
    };
  }

  @Get('/trading-volume')
  @UseGuards(JwtAuthGuard)
  async getTradingVolume(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    const tradingVolume = await this.assetService.getTradingVolume(userId);
    const onChainTradingVolume =
      await this.transactionHistoryService.getTradingVolume(userId);
    return {
      user_id: userId,
      tradingVolume: tradingVolume.toString(),
      onChainTradingVolume: onChainTradingVolume.toString(),
      totalTradingVolume: tradingVolume.plus(onChainTradingVolume).toString(),
    };
  }

  @Get('/snapshot')
  async getSnapshot(@Request() req: ExpressRequest) {
    const snapshot = await this.assetService.createUserAssetSnapshots();
    return {
      success: true,
    };
  }
}
