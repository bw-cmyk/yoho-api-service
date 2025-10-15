import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenService } from './token.service';
import { CandleData } from '../dex/okx';
import { Decimal } from 'decimal.js';
import { RedisQueueService } from 'src/common-modules/queue/redis-queue.service';
import { OKXQueueService } from '../dex/okx-queue.service';
import {
  OKX_TRENDING_CALLBACK_FUNCTION_ID,
  OKX_TOKEN_SYNC_CALLBACK_FUNCTION_ID,
} from '../constants';

@Injectable()
export class TokenPriceUpdaterService {
  private readonly logger = new Logger(TokenPriceUpdaterService.name);

  constructor(
    private readonly tokenService: TokenService,
    private readonly queueService: RedisQueueService,
    private readonly okxQueueService: OKXQueueService,
  ) {
    this.initializeCallbacks();
  }

  /**
   * 初始化回调函数
   */
  private initializeCallbacks(): void {
    // 注册token同步回调
    this.queueService.registerCallbackFunction(
      OKX_TOKEN_SYNC_CALLBACK_FUNCTION_ID,
      async (result: any, requestParams: any) => {
        if (result && Array.isArray(result)) {
          await this.processTokenSyncResult(result, requestParams);
        }
      },
    );

    // 注册趋势回调
    this.queueService.registerCallbackFunction(
      OKX_TRENDING_CALLBACK_FUNCTION_ID,
      async (result: any, requestParams: any) => {
        if (result && Array.isArray(result)) {
          await this.updateTokenTrending(result, requestParams);
        }
      },
    );
  }

  /**
   * 每小时更新token价格数据
   */
  @Cron(CronExpression.EVERY_HOUR)
  async updateTokenPrices(): Promise<void> {
    this.logger.log('Starting token price update...');

    try {
      // 获取所有活跃的token
      const { tokens } = await this.tokenService.getTokens({
        isActive: true,
        limit: 1000, // 获取所有token
      });

      this.logger.log(`Found ${tokens.length} active tokens to update`);

      // 按链分组
      const tokensByChain = tokens.reduce((groups, token) => {
        if (!groups[token.chainIndex]) {
          groups[token.chainIndex] = [];
        }
        groups[token.chainIndex].push(token);
        return groups;
      }, {} as Record<string, typeof tokens>);

      // 为每个链更新价格
      for (const [chainIndex, chainTokens] of Object.entries(tokensByChain)) {
        await this.updateTokensForChain(chainIndex, chainTokens);
      }

      this.logger.log('Token price update completed successfully');
    } catch (error) {
      this.logger.error('Failed to update token prices:', error);
    }
  }
  /**
   * 为特定链更新token价格
   */
  private async updateTokensForChain(
    chainIndex: string,
    tokens: any[],
  ): Promise<void> {
    this.logger.log(
      `Queuing price updates for ${tokens.length} tokens on chain ${chainIndex}`,
    );

    const queuePromises = tokens.map(async (token) => {
      try {
        // 使用队列化的请求获取K线数据
        const requestId = await this.okxQueueService.getHistoricalCandles(
          {
            chainIndex,
            tokenContractAddress: token.tokenContractAddress,
            bar: '1H',
            limit: '24',
          },
          OKX_TRENDING_CALLBACK_FUNCTION_ID,
          5, // 高优先级
        );

        this.logger.debug(
          `Queued price update request for token ${token.tokenSymbol}: ${requestId}`,
        );

        return requestId;
      } catch (error) {
        this.logger.error(
          `Failed to queue price update for token ${token.tokenSymbol}:`,
          error,
        );
        return null;
      }
    });

    const requestIds = await Promise.all(queuePromises);
    const successfulRequests = requestIds.filter((id) => id !== null);

    this.logger.log(
      `Queued ${successfulRequests.length} price update requests for chain ${chainIndex}`,
    );
  }

  /**
   * 处理token同步结果
   */
  private async processTokenSyncResult(
    tokens: any[],
    requestParams: any,
  ): Promise<void> {
    const { queryParams } = requestParams;
    const { chainIndex } = queryParams;

    this.logger.log(
      `Processing ${tokens.length} tokens for chain ${chainIndex}`,
    );

    try {
      // 这里可以添加处理token同步结果的逻辑
      // 比如保存到数据库、更新缓存等
      for (const tokenData of tokens) {
        this.logger.debug(
          `Processing token: ${tokenData.tokenSymbol} (${tokenData.tokenContractAddress})`,
        );

        // 可以调用 tokenService 来保存或更新token信息
        // await this.tokenService.saveOrUpdateToken(tokenData);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process token sync result for chain ${chainIndex}:`,
        error,
      );
    }
  }

  private async updateTokenTrending(
    candles: CandleData[],
    requestParams: any,
  ): Promise<void> {
    const { queryParams } = requestParams;
    const { chainIndex, tokenContractAddress } = queryParams;
    // console.log(candles)
    try {
      const token = await this.tokenService.getTokenByContractAddress(
        chainIndex,
        tokenContractAddress,
      );

      if (!token) {
        this.logger.warn(
          `Token not found for contract address ${tokenContractAddress} on chain ${chainIndex}`,
        );
        return;
      }

      if (candles.length >= 2) {
        // Candle Data
        // [
        //   '1759086000000', ts	String	开始时间，Unix时间戳的毫秒数格式，如 1597026383085
        //   '4041.7608663503797', o	String	开盘价格
        //   '4107.142570976835', h	String	最高价格
        //   '4003.618194358765', l	String	最低价格
        //   '4038.577932881183', c	String	收盘价格
        //   '185.8560739923427684', vol	String	交易量，以目标币种为单位
        //   '750531.9063549468313', volUsd	String	交易量，以美元为单位
        //   '1'
        // ]
        const latestCandle = candles[0];
        const previousCandle = candles[candles.length - 1];

        const currentPrice = new Decimal(latestCandle[4]);
        const previousPrice = new Decimal(previousCandle[4]);
        const priceChange24h = currentPrice.minus(previousPrice);
        const priceChangePercentage24h = previousPrice.gt(0)
          ? priceChange24h.div(previousPrice)
          : new Decimal(0);

        // 计算24小时交易量
        const volume24h = candles.reduce((sum, candle) => {
          return sum.plus(new Decimal(candle[6]));
        }, new Decimal(0));

        // 更新token价格
        await this.tokenService.updateTokenPrice({
          tokenId: token.id,
          currentPriceUsd: currentPrice,
          priceChange24h,
          priceChangePercentage24h,
          volume24hUsd: volume24h,
          candleData: candles,
        });

        this.logger.debug(
          `Updated price for ${token.tokenSymbol}: $${currentPrice.toFixed(8)}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update token trending for ${tokenContractAddress}:`,
        error,
      );
    }
  }

  /**
   * 获取更新状态
   */
  async getUpdateStatus(): Promise<{
    lastPriceUpdate: Date | null;
    lastTokenSync: Date | null;
    lastPriceHistoryUpdate: Date | null;
    totalTokens: number;
    activeTokens: number;
    queueStatus: any;
  }> {
    const stats = await this.tokenService.getTokenStats();
    const queueStatus = await this.okxQueueService.getQueueStatus();

    // 这里可以添加从数据库获取最后更新时间的逻辑
    // 暂时返回当前时间作为示例
    return {
      lastPriceUpdate: new Date(),
      lastTokenSync: new Date(),
      lastPriceHistoryUpdate: new Date(),
      totalTokens: stats.totalTokens,
      activeTokens: stats.activeTokens,
      queueStatus,
    };
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    return this.okxQueueService.getQueueStatus();
  }

  /**
   * 获取队列中的所有项目
   */
  async getQueueItems() {
    return this.okxQueueService.getQueueItems();
  }

  /**
   * 清空队列
   */
  async clearQueue() {
    return this.okxQueueService.clearQueue();
  }
}
