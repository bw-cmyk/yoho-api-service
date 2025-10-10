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

@Controller('transaction-history')
@UseGuards(JwtAuthGuard)
export class TransactionHistoryController {
  private readonly logger = new Logger(TransactionHistoryController.name);

  constructor(
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {}

  /**
   * 获取交易历史（队列化请求）
   */
  @Post('fetch')
  async fetchTransactionHistory(
    @Body() params: GetTransactionHistoryQuery,
    @Request() req: any,
  ): Promise<{
    success: boolean;
    requestId: string;
    message: string;
  }> {
    try {
      this.logger.log(
        `User ${req.user.id} requesting transaction history for address: ${params.address}`,
      );

      const requestId =
        await this.transactionHistoryService.getTransactionHistory(
          params,
          5, // 高优先级
        );

      return {
        success: true,
        requestId,
        message: 'Transaction history request queued successfully',
      };
    } catch (error) {
      this.logger.error('Failed to queue transaction history request:', error);
      return {
        success: false,
        requestId: '',
        message: 'Failed to queue transaction history request',
      };
    }
  }

  /**
   * 从数据库获取交易历史
   */
  @Get('db/:address')
  async getTransactionHistoryFromDB(
    @Param('address') address: string,
    @Request() req: any,
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
    try {
      this.logger.log(
        `User ${req.user.id} requesting transaction history from DB for address: ${address}`,
      );

      const begin = query.begin ? new Date(query.begin) : undefined;
      const end = query.end ? new Date(query.end) : undefined;
      const limit = query.limit || 100;
      const offset = query.offset || 0;

      const result =
        await this.transactionHistoryService.getTransactionHistoryFromDB(
          address,
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
   * 获取代币持仓
   */
  @Get('positions/:address')
  async getTokenPositions(
    @Param('address') address: string,
    @Request() req: any,
    @Query('chainIndex') chainIndex?: string,
  ): Promise<{
    success: boolean;
    data: {
      positions: Array<{
        tokenContractAddress: string;
        symbol: string;
        chainIndex: string;
        totalAmount: string;
        averageCostBasis: string;
        currentPrice: string;
        currentValue: string;
        unrealizedPnl: string;
        realizedPnl: string;
        totalPnl: string;
        pnlPercentage: string;
      }>;
    };
  }> {
    try {
      this.logger.log(
        `User ${req.user.id} requesting token positions for address: ${address}`,
      );

      const positions = await this.transactionHistoryService.getTokenPositions(
        address,
        chainIndex,
      );

      return {
        success: true,
        data: {
          positions: positions.map((pos) => ({
            tokenContractAddress: pos.tokenContractAddress,
            symbol: pos.symbol,
            chainIndex: pos.chainIndex,
            totalAmount: pos.totalAmount.toString(),
            averageCostBasis: pos.averageCostBasis.toString(),
            currentPrice: pos.currentPrice.toString(),
            currentValue: pos.currentValue.toString(),
            unrealizedPnl: pos.unrealizedPnl.toString(),
            realizedPnl: pos.realizedPnl.toString(),
            totalPnl: pos.totalPnl.toString(),
            pnlPercentage: pos.pnlPercentage.toString(),
          })),
        },
      };
    } catch (error) {
      this.logger.error('Failed to get token positions:', error);
      return {
        success: false,
        data: {
          positions: [],
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

  /**
   * 获取队列状态
   */
  @Get('queue/status')
  async getQueueStatus(): Promise<{
    success: boolean;
    data: any;
  }> {
    try {
      const status = await this.transactionHistoryService[
        'okxQueueService'
      ].getQueueStatus();

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      this.logger.error('Failed to get queue status:', error);
      return {
        success: false,
        data: null,
      };
    }
  }

  /**
   * 获取队列中的所有项目
   */
  @Get('queue/items')
  async getQueueItems(): Promise<{
    success: boolean;
    data: any[];
  }> {
    try {
      const items = await this.transactionHistoryService[
        'okxQueueService'
      ].getQueueItems();

      return {
        success: true,
        data: items,
      };
    } catch (error) {
      this.logger.error('Failed to get queue items:', error);
      return {
        success: false,
        data: [],
      };
    }
  }
}
