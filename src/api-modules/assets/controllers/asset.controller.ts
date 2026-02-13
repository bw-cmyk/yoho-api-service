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
import { USDT_CONTRACT_ADDRESS } from 'src/constants';
import { formatUnits } from 'ethers';
import { TransactionItype } from '../entities/onchain/transaction-onchain-history.entity';
import { UserService } from 'src/api-modules/user/service/user.service';

@ApiTags('资产管理')
@Controller('/api/v1/assets')
export class AssetController {
  constructor(
    private readonly assetService: AssetService,
    private readonly transactionHistoryService: TransactionHistoryService,
    private readonly userService: UserService,
  ) {}

  @Get('chain-assets')
  async getUserChainAssets(@Request() req: ExpressRequest) {
    const userId = req.query.userId;
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
    return {
      user_id: userId,
      assets: assets.map((asset) => ({
        currency: asset.currency,
        ...asset.getBalanceDetails(),
      })),
      onchainAssets: onchainAssets
        .filter((asset) => asset.token !== undefined)
        .map((asset) => ({
          tokenSymbol: asset.tokenSymbol,
          ...asset.getAssetDetails(),
          tokenInfo: asset.token,
        })),
      yesterdayAssets: yesterdaySnapshot,
    };
  }

  // get balance history
  @Get('/balance-history')
  @UseGuards(JwtAuthGuard)
  async getBalanceHistory(
    @Request() req: ExpressRequest,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    const { id: userId } = req.user as any;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    const { transactions, total } =
      await this.assetService.getTransactionHistory(
        userId,
        undefined,
        pageNum,
        limitNum,
      );

    return {
      user_id: userId,
      balanceHistory: transactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    };
  }

  @Get('/trading-volume')
  @UseGuards(JwtAuthGuard)
  async getTradingVolume(@Request() req: ExpressRequest) {
    const { id: userId } = req.user as any;
    const tradingVolume = await this.assetService.getTradingVolume(userId);
    const onChainTradingVolume =
      await this.transactionHistoryService.getTradingVolume(userId);

    const userInfo = await this.userService.getUser(userId);
    const result =
      await this.transactionHistoryService.getOnChainTransactionByConditions({
        address: userInfo.evmAAWallet,
        order: 'ASC',
        itype: TransactionItype.TOKEN_TRANSFER,
      });

    let firstDepositAmount = 0;
    for (const transaction of result) {
      if (transaction.tokenContractAddress === USDT_CONTRACT_ADDRESS) {
        firstDepositAmount = transaction.amount.toNumber();
        break;
      }
    }
    return {
      user_id: userId,
      tradingVolume: tradingVolume.toString(),
      onChainTradingVolume: onChainTradingVolume.toString(),
      totalTradingVolume: tradingVolume.plus(onChainTradingVolume).toString(),
      firstDepositAmount: firstDepositAmount,
      firstDepositRewardAmount: Math.min(firstDepositAmount * 2.5, 120),
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
