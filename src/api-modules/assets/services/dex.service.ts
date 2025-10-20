import { Injectable, Logger, Inject } from '@nestjs/common';
import { OKXDEX, SwapQuoteParams, SwapQuoteData } from '../dex/okx';
import { OKXQueueService } from '../dex/okx-queue.service';
import { RedisQueueService } from 'src/common-modules/queue/redis-queue.service';
import { OKX_SWAP_QUOTE_CALLBACK_FUNCTION_ID } from '../constants';

@Injectable()
export class DexService {
  private readonly logger = new Logger(DexService.name);

  constructor(
    @Inject(OKXDEX)
    private readonly okxDex: OKXDEX,
    private readonly okxQueueService: OKXQueueService,
    private readonly queueService: RedisQueueService,
  ) {
    this.initializeCallbacks();
  }

  /**
   * 初始化回调函数
   */
  private initializeCallbacks(): void {
    // 注册交换报价回调
    this.queueService.registerCallbackFunction(
      OKX_SWAP_QUOTE_CALLBACK_FUNCTION_ID,
      async (result: any, requestParams: any) => {
        this.logger.log('Swap quote callback executed:', {
          result: result ? 'success' : 'failed',
          requestParams,
        });
        // 这里可以添加额外的回调处理逻辑
        // 比如缓存结果、发送通知等
      },
    );
  }

  /**
   * 直接获取交换报价（同步）
   * @param params 交换参数
   * @returns 交换报价数据
   */
  async getSwapQuote(params: SwapQuoteParams): Promise<SwapQuoteData[]> {
    try {
      this.logger.log(
        `Getting swap quote for ${params.fromTokenAddress} to ${params.toTokenAddress}`,
      );

      const result = await this.okxDex.getSwapQuote(params);

      this.logger.log(`Swap quote retrieved successfully`, {
        fromToken: params.fromTokenAddress,
        toToken: params.toTokenAddress,
        amount: params.amount,
        resultCount: result.length,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get swap quote:`, error);
      throw error;
    }
  }

  /**
   * 队列化获取交换报价（异步）
   * @param params 交换参数
   * @param priority 优先级
   * @returns 队列ID
   */
  async getSwapQuoteAsync(
    params: SwapQuoteParams,
    priority = 0,
  ): Promise<string> {
    this.logger.log(
      `Queuing swap quote request for ${params.fromTokenAddress} to ${params.toTokenAddress}`,
    );

    return this.okxQueueService.getSwapQuote(
      params,
      OKX_SWAP_QUOTE_CALLBACK_FUNCTION_ID,
      priority,
    );
  }
}
