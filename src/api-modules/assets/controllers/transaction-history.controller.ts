import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { TransactionHistoryService } from '../services/transaction-history.service';
import { JwtAuthGuard } from 'src/common-modules/auth/jwt-auth.guard';
import { Request as ExpressRequest } from 'express';
import { AssetService } from '../services/asset.service';
import { UserService } from 'src/api-modules/user/service/user.service';

export interface GetTransactionHistoryQuery {
  address: string;
  chains: string;
  tokenContractAddress?: string;
  begin?: string;
  end?: string;
  cursor?: string;
  limit?: string;
}

export interface GetTransactionHistoryFromDBQuery {
  chainIndex?: string;
  tokenContractAddress?: string;
  begin?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

@Controller('/api/v1/transaction-history')
export class TransactionHistoryController {
  private readonly logger = new Logger(TransactionHistoryController.name);

  constructor(
    private readonly assetService: AssetService,
    private readonly transactionHistoryService: TransactionHistoryService,
    private readonly userService: UserService,
  ) {}

  /**
   * 获取 win 的信息
   */
  @Get('win')
  @UseGuards(JwtAuthGuard)
  async getRecentWinningHistory() {
    const result = await this.assetService.getRecentWinningHistory();
    const uids = result.map((item) => item.userId);
    const users = await this.userService.getUsersByUids(uids);
    return result.map((tx) => {
      const userInfo = users.find((item) => item.id === tx.userId);
      return {
        userId: tx.userId,
        username: userInfo.nickname || userInfo.botimName || userInfo.username,
        amount: tx.amount,
        createdAt: tx.created_at,
        gameId: tx.reference_id,
      };
    });
  }

  /**
   * 从数据库获取交易历史
   */
  @Get('list')
  @UseGuards(JwtAuthGuard)
  async getTransactionHistoryFromDB(
    @Request() req: ExpressRequest,
    @Query() query: GetTransactionHistoryFromDBQuery,
  ): Promise<{
    success: boolean;
    data: {
      transactions: any[];
      total: number;
      pagination: {
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    };
  }> {
    const { id: userId } = req.user as any;
    try {
      const begin = query.begin ? new Date(query.begin) : undefined;
      const end = query.end ? new Date(query.end) : undefined;
      const limit = query.limit || 100;
      const offset = query.offset || 0;

      const result =
        await this.transactionHistoryService.getTransactionHistoryFromDB(
          userId,
          query.chainIndex,
          query.tokenContractAddress,
          begin,
          end,
          limit,
          offset,
        );

      return {
        success: true,
        data: {
          transactions: result.transactions.map((tx) => tx.getSummary()),
          total: result.total,
          pagination: {
            limit,
            offset,
            hasMore: offset + limit < result.total,
          },
        },
      };
    } catch (error) {
      this.logger.error('Failed to get transaction history from DB:', error);
      return {
        success: false,
        data: {
          transactions: [],
          total: 0,
          pagination: {
            limit: query.limit || 100,
            offset: query.offset || 0,
            hasMore: false,
          },
        },
      };
    }
  }

  /**
   * 计算 PnL
   */
  @Get('pnl/:address')
  async calculatePnL(
    @Param('address') address: string,
    @Request() req: any,
    @Query('chainIndex') chainIndex?: string,
    @Query('tokenContractAddress') tokenContractAddress?: string,
  ): Promise<{
    success: boolean;
    data: {
      totalRealizedPnl: string;
      totalUnrealizedPnl: string;
      totalPnl: string;
      totalCostBasis: string;
      totalCurrentValue: string;
      pnlPercentage: string;
      transactionCount: number;
    };
  }> {
    try {
      this.logger.log(
        `User ${req.user.id} requesting PnL calculation for address: ${address}`,
      );

      const pnl = await this.transactionHistoryService.calculatePnL(
        address,
        chainIndex,
        tokenContractAddress,
      );

      return {
        success: true,
        data: {
          totalRealizedPnl: pnl.totalRealizedPnl.toString(),
          totalUnrealizedPnl: pnl.totalUnrealizedPnl.toString(),
          totalPnl: pnl.totalPnl.toString(),
          totalCostBasis: pnl.totalCostBasis.toString(),
          totalCurrentValue: pnl.totalCurrentValue.toString(),
          pnlPercentage: pnl.pnlPercentage.toString(),
          transactionCount: pnl.transactionCount,
        },
      };
    } catch (error) {
      this.logger.error('Failed to calculate PnL:', error);
      return {
        success: false,
        data: {
          totalRealizedPnl: '0',
          totalUnrealizedPnl: '0',
          totalPnl: '0',
          totalCostBasis: '0',
          totalCurrentValue: '0',
          pnlPercentage: '0',
          transactionCount: 0,
        },
      };
    }
  }
  /**
   * 获取交易统计
   */
  @Get('stats/:address')
  async getTransactionStats(
    @Param('address') address: string,
    @Request() req: any,
    @Query('chainIndex') chainIndex?: string,
    @Query('begin') begin?: string,
    @Query('end') end?: string,
  ): Promise<{
    success: boolean;
    data: {
      totalTransactions: number;
      successfulTransactions: number;
      failedTransactions: number;
      totalVolume: string;
      totalFees: string;
    };
  }> {
    try {
      this.logger.log(
        `User ${req.user.id} requesting transaction stats for address: ${address}`,
      );

      const beginDate = begin ? new Date(begin) : undefined;
      const endDate = end ? new Date(end) : undefined;

      const stats = await this.transactionHistoryService.getTransactionStats(
        address,
        chainIndex,
        beginDate,
        endDate,
      );

      return {
        success: true,
        data: {
          totalTransactions: stats.totalTransactions,
          successfulTransactions: stats.successfulTransactions,
          failedTransactions: stats.failedTransactions,
          totalVolume: stats.totalVolume.toString(),
          totalFees: stats.totalFees.toString(),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get transaction stats:', error);
      return {
        success: false,
        data: {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          totalVolume: '0',
          totalFees: '0',
        },
      };
    }
  }
}
