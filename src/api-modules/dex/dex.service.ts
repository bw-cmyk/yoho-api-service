import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  OKXDEX,
  SwapQuoteParams,
  SwapQuoteData,
  SwapParams,
  SwapData,
  ApproveTransactionParams,
  ApproveTransactionData,
} from '../assets/dex/okx';
import { OKXQueueService } from '../assets/dex/okx-queue.service';
import { RedisQueueService } from 'src/common-modules/queue/redis-queue.service';
import { OKX_SWAP_QUOTE_CALLBACK_FUNCTION_ID } from '../assets/constants';

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

  /**
   * 获取交换数据（同步）
   * @param params 交换参数
   * @returns 交换数据
   */
  async getSwap(params: SwapParams): Promise<SwapData> {
    try {
      this.logger.log(
        `Getting swap data for ${params.fromTokenAddress} to ${params.toTokenAddress}`,
        {
          chainIndex: params.chainIndex,
          amount: params.amount,
          swapMode: params.swapMode,
          userWalletAddress: params.userWalletAddress,
        },
      );

      const result = await this.okxDex.getSwap(params);

      this.logger.log(`Swap data retrieved successfully`, {
        fromToken: params.fromTokenAddress,
        toToken: params.toTokenAddress,
        amount: params.amount,
        fromTokenAmount: result.fromTokenAmount,
        toTokenAmount: result.toTokenAmount,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get swap data:`, error);
      throw error;
    }
  }

  /**
   * 获取授权交易数据（同步）
   * @param params 授权交易参数
   * @returns 授权交易数据
   */
  async getApproveTransaction(
    params: ApproveTransactionParams,
  ): Promise<ApproveTransactionData> {
    try {
      this.logger.log(`Getting approve transaction for token ${params.tokenContractAddress}`, {
        chainIndex: params.chainIndex,
        approveAmount: params.approveAmount,
      });

      const result = await this.okxDex.getApproveTransaction(params);

      this.logger.log(`Approve transaction retrieved successfully`, {
        tokenContractAddress: params.tokenContractAddress,
        chainIndex: params.chainIndex,
      });

      return result;
    } catch (error) {
      this.logger.error(`Failed to get approve transaction:`, error);
      throw error;
    }
  }
}
