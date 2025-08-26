import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Decimal } from 'decimal.js';
import {
  AssetService,
  DepositRequest,
  BetRequest,
  WinRequest,
  WithdrawRequest,
} from '../services/asset.service';
import { Currency } from '../entities/user-asset.entity';
import { TransactionType } from '../entities/transaction.entity';

@ApiTags('资产管理')
@Controller('/api/v1/assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Get(':userId')
  @ApiOperation({ summary: '获取用户资产' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserAssets(@Param('userId', ParseIntPipe) userId: number) {
    const assets = await this.assetService.getUserAssets(userId);
    return {
      user_id: userId,
      assets: assets.map((asset) => ({
        currency: asset.currency,
        ...asset.getBalanceDetails(),
      })),
    };
  }

  @Get(':userId/:currency')
  @ApiOperation({ summary: '获取用户指定币种资产' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserAsset(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('currency') currency: Currency,
  ) {
    const asset = await this.assetService.getUserAsset(userId, currency);
    return {
      user_id: userId,
      currency: asset.currency,
      ...asset.getBalanceDetails(),
    };
  }

  @Post('deposit')
  @ApiOperation({ summary: '用户充值' })
  @ApiResponse({ status: 201, description: '充值成功' })
  async deposit(
    @Body()
    request: {
      user_id: number;
      currency: Currency;
      amount: string;
      reference_id?: string;
      description?: string;
    },
  ) {
    const result = await this.assetService.deposit({
      ...request,
      amount: new Decimal(request.amount),
    });

    return {
      success: true,
      asset: {
        currency: result.asset.currency,
        ...result.asset.getBalanceDetails(),
      },
      transactions: result.transactions.map((t) => t.getSummary()),
    };
  }

  @Post('bet')
  @ApiOperation({ summary: '游戏下注' })
  @ApiResponse({ status: 201, description: '下注成功' })
  async bet(
    @Body()
    request: {
      user_id: number;
      currency: Currency;
      amount: string;
      game_id: string;
      description?: string;
    },
  ) {
    const result = await this.assetService.bet({
      ...request,
      amount: new Decimal(request.amount),
    });

    return {
      success: true,
      asset: {
        currency: result.asset.currency,
        ...result.asset.getBalanceDetails(),
      },
      transaction: result.transaction.getSummary(),
    };
  }

  @Post('win')
  @ApiOperation({ summary: '游戏中奖' })
  @ApiResponse({ status: 201, description: '中奖成功' })
  async win(
    @Body()
    request: {
      user_id: number;
      currency: Currency;
      amount: string;
      game_id: string;
      description?: string;
    },
  ) {
    const result = await this.assetService.win({
      ...request,
      amount: new Decimal(request.amount),
    });

    return {
      success: true,
      asset: {
        currency: result.asset.currency,
        ...result.asset.getBalanceDetails(),
      },
      transaction: result.transaction.getSummary(),
    };
  }

  @Post('withdraw')
  @ApiOperation({ summary: '用户提现' })
  @ApiResponse({ status: 201, description: '提现成功' })
  async withdraw(
    @Body()
    request: {
      user_id: number;
      currency: Currency;
      amount: string;
      reference_id?: string;
      description?: string;
    },
  ) {
    const result = await this.assetService.withdraw({
      ...request,
      amount: new Decimal(request.amount),
    });

    return {
      success: true,
      asset: {
        currency: result.asset.currency,
        ...result.asset.getBalanceDetails(),
      },
      transaction: result.transaction.getSummary(),
    };
  }

  @Post('lock')
  @ApiOperation({ summary: '锁定余额' })
  @ApiResponse({ status: 201, description: '锁定成功' })
  async lockBalance(
    @Body()
    request: {
      user_id: number;
      currency: Currency;
      amount: string;
      reference_id: string;
    },
  ) {
    const asset = await this.assetService.lockBalance(
      request.user_id,
      request.currency,
      new Decimal(request.amount),
      request.reference_id,
    );

    return {
      success: true,
      asset: {
        currency: asset.currency,
        ...asset.getBalanceDetails(),
      },
    };
  }

  @Post('unlock')
  @ApiOperation({ summary: '解锁余额' })
  @ApiResponse({ status: 201, description: '解锁成功' })
  async unlockBalance(
    @Body()
    request: {
      user_id: number;
      currency: Currency;
      amount: string;
      reference_id: string;
    },
  ) {
    const asset = await this.assetService.unlockBalance(
      request.user_id,
      request.currency,
      new Decimal(request.amount),
      request.reference_id,
    );

    return {
      success: true,
      asset: {
        currency: asset.currency,
        ...asset.getBalanceDetails(),
      },
    };
  }

  @Get(':userId/transactions')
  @ApiOperation({ summary: '获取用户交易历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getTransactionHistory(
    @Param('userId', ParseIntPipe) userId: number,
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
