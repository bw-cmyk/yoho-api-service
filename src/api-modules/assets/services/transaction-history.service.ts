import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ethers, JsonRpcProvider } from 'ethers';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import {
  TransactionHistory,
  TransactionItype,
  TransactionStatus,
} from '../entities/onchain/transaction-onchain-history.entity';
import { OKXQueueService } from '../dex/okx-queue.service';
import { RedisQueueService } from 'src/common-modules/queue/redis-queue.service';
import { OKX_TRANSACTION_HISTORY_CALLBACK_FUNCTION_ID } from '../constants';
import { extractParamsFromTxByTopic } from '../dex/bsc/pancakeParser';
import { UserService } from 'src/api-modules/user/service/user.service';
import { Token } from 'src/api-modules/dex/token.entity';
import redisClient from 'src/common-modules/redis/redis-client';

export interface TransactionHistoryParams {
  address: string;
  chains: string;
  tokenContractAddress?: string;
  begin?: string;
  end?: string;
  cursor?: string;
  limit?: string;
}

export interface PnLCalculation {
  totalRealizedPnl: Decimal;
  totalUnrealizedPnl: Decimal;
  totalPnl: Decimal;
  totalCostBasis: Decimal;
  totalCurrentValue: Decimal;
  pnlPercentage: Decimal;
  transactionCount: number;
}

export interface TokenPosition {
  tokenContractAddress: string;
  symbol: string;
  chainIndex: string;
  totalAmount: Decimal;
  averageCostBasis: Decimal;
  currentPrice: Decimal;
  currentValue: Decimal;
  unrealizedPnl: Decimal;
  realizedPnl: Decimal;
  totalPnl: Decimal;
  pnlPercentage: Decimal;
}

@Injectable()
export class TransactionHistoryService {
  private readonly logger = new Logger(TransactionHistoryService.name);
  private readonly provider: JsonRpcProvider;

  constructor(
    @InjectRepository(TransactionHistory)
    private readonly transactionHistoryRepository: Repository<TransactionHistory>,

    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,

    private readonly userService: UserService,
    private readonly okxQueueService: OKXQueueService,
    private readonly queueService: RedisQueueService,
  ) {
    this.initializeCallbacks();
    this.provider = new JsonRpcProvider(process.env.RPC_URL);
  }

  /**
   * 初始化回调函数
   */
  private initializeCallbacks(): void {
    // 注册交易历史回调
    this.queueService.registerCallbackFunction(
      OKX_TRANSACTION_HISTORY_CALLBACK_FUNCTION_ID,
      async (result: any, requestParams: any) => {
        console.log('result: ', result);
        console.log('requestParams: ', requestParams);
        if (
          result &&
          result[0] &&
          result[0].transactions &&
          Array.isArray(result[0].transactions)
        ) {
          await this.processTransactionHistoryResult(
            result[0].transactions,
            requestParams,
          );
        }
      },
    );
  }

  /**
   * 获取交易历史（队列化）
   */
  async getTransactionHistory(
    params: TransactionHistoryParams,
    priority = 0,
  ): Promise<string> {
    this.logger.log(
      `Queuing transaction history request for address: ${params.address}`,
    );

    // add redis lock to prevent duplicate requests
    const lockKey = `transaction-history-lock:${params.address}`;
    const lock = await this.getRedisLock(lockKey);
    if (!lock) {
      this.logger.error(
        `Failed to get redis lock for address ${params.address}, Waiting for other instance to finish`,
      );
      return;
    }
    console.log('get redis lock success');

    return this.okxQueueService.getTransactionHistory(
      params,
      OKX_TRANSACTION_HISTORY_CALLBACK_FUNCTION_ID,
      priority,
    );
  }

  /**
   * 处理交易历史结果
   */
  private async processTransactionHistoryResult(
    transactions: any[],
    requestParams: any,
  ): Promise<void> {
    const { queryParams } = requestParams;
    const { address } = queryParams;

    this.logger.log(
      `Processing ${transactions.length} transactions for address ${address}`,
    );

    try {
      for (const txData of transactions) {
        await this.saveOrUpdateTransaction(address, txData);
      }

      this.logger.log(
        `Successfully processed ${transactions.length} transactions for address ${address}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process transaction history for address ${address}:`,
        error,
      );
    }
  }

  /**
   * 保存或更新交易记录
   */
  private async saveOrUpdateTransaction(
    address: string,
    txData: any,
  ): Promise<void> {
    try {
      const existingTx = await this.transactionHistoryRepository.findOne({
        where: { txHash: txData.txHash },
      });

      if (existingTx) {
        // 更新现有记录
        await this.transactionHistoryRepository.update(
          { txHash: txData.txHash },
          {
            txStatus: txData.txStatus,
            hitBlacklist: txData.hitBlacklist,
            updatedAt: new Date(),
          },
        );
      } else {
        // ethers get transaction
        const params = await extractParamsFromTxByTopic(
          txData.txHash,
          this.provider,
        );
        console.log('params: ', params);
        const tokenContractAddress =
          params &&
          params.type === TransactionItype.SWAP &&
          params.outputToken !== '0x55d398326f99059fF775485246999027B3197955'
            ? params?.outputToken
            : params?.inputToken;
        // 创建新记录
        const transaction = this.transactionHistoryRepository.create({
          address: address,
          chainIndex: txData.chainIndex,
          txHash: txData.txHash,
          itype: params ? params.type : TransactionItype.OTHER,
          methodId: txData.methodId,
          nonce: txData.nonce,
          txTime: parseInt(txData.txTime),
          from: txData.from || [],
          to: txData.to || [],
          tokenContractAddress: txData.tokenContractAddress
            ? this.formatAddress(txData.tokenContractAddress)
            : tokenContractAddress,
          amount: txData.amount ? new Decimal(txData.amount) : null,
          symbol: txData.symbol,
          txFee: txData.txFee ? new Decimal(txData.txFee) : null,
          txStatus: txData.txStatus as TransactionStatus,
          hitBlacklist: txData.hitBlacklist || false,
          metadata: params,
        });

        await this.transactionHistoryRepository.save(transaction);
      }
    } catch (error) {
      this.logger.error(`Failed to save transaction ${txData.txHash}:`, error);
    }
  }

  /**
   * 从数据库获取交易历史
   */
  async getTransactionHistoryFromDB(
    userId: string,
    chainIndex?: string,
    tokenContractAddress?: string,
    begin?: Date,
    end?: Date,
    limit = 100,
    offset = 0,
  ): Promise<{
    transactions: TransactionHistory[];
    total: number;
  }> {
    const user = await this.userService.getUser(userId);
    const queryBuilder = this.transactionHistoryRepository
      .createQueryBuilder('tx')
      .where('tx.address = :address', { address: user.evmAAWallet });

    if (chainIndex) {
      queryBuilder.andWhere('tx.chainIndex = :chainIndex', { chainIndex });
    }

    if (tokenContractAddress) {
      queryBuilder.andWhere('tx.tokenContractAddress = :tokenContractAddress', {
        tokenContractAddress,
      });
    }

    if (begin && end) {
      queryBuilder.andWhere('tx.txTime BETWEEN :begin AND :end', {
        begin: begin.getTime(),
        end: end.getTime(),
      });
    }

    const [transactions, total] = await queryBuilder
      .orderBy('tx.txTime', 'DESC')
      .limit(limit)
      .offset(offset)
      .getManyAndCount();

    if (user.evmAAWallet) {
      await this.getTransactionHistory({
        address: user.evmAAWallet,
        chains: chainIndex,
      });
    }

    return { transactions, total };
  }

  async getTokensTransactionsFromDB(
    tokenContractAddress?: string,
    limit = 100,
    offset = 0,
  ): Promise<TransactionHistory[]> {
    const queryBuilder = this.transactionHistoryRepository
      .createQueryBuilder('tx')
      .where('tx."tokenContractAddress" = :tokenContractAddress', {
        tokenContractAddress,
      })
      .andWhere('tx.itype = :itype', { itype: TransactionItype.SWAP });

    if (limit) {
      queryBuilder.limit(limit);
    }

    if (offset) {
      queryBuilder.offset(offset);
    }

    const transactions = await queryBuilder
      .orderBy('tx.txTime', 'ASC')
      .getMany();

    return transactions;
  }

  async getOnChainTransactionByConditions(conditions: {
    itype?: TransactionItype;
  }): Promise<TransactionHistory[]> {
    const queryBuilder =
      this.transactionHistoryRepository.createQueryBuilder('tx');

    if (conditions.itype) {
      queryBuilder.andWhere('tx.itype = :itype', { itype: conditions.itype });
    } else {
      return [];
    }

    const transactions = await queryBuilder.getMany();
    return transactions;
  }

  /**
   * 计算 PnL
   */
  async calculatePnL(
    address: string,
    chainIndex?: string,
    tokenContractAddress?: string,
  ): Promise<PnLCalculation> {
    const queryBuilder = this.transactionHistoryRepository
      .createQueryBuilder('tx')
      .where('tx.address = :address', { address })
      .andWhere('tx.txStatus = :status', { status: TransactionStatus.SUCCESS });

    if (chainIndex) {
      queryBuilder.andWhere('tx.chainIndex = :chainIndex', { chainIndex });
    }

    if (tokenContractAddress) {
      queryBuilder.andWhere('tx.tokenContractAddress = :tokenContractAddress', {
        tokenContractAddress,
      });
    }

    const transactions = await queryBuilder
      .orderBy('tx.txTime', 'ASC')
      .getMany();

    let totalRealizedPnl = new Decimal(0);
    let totalUnrealizedPnl = new Decimal(0);
    let totalCostBasis = new Decimal(0);
    let totalCurrentValue = new Decimal(0);
    let transactionCount = 0;

    // 按代币分组计算
    const tokenGroups = this.groupTransactionsByToken(transactions);

    for (const [, tokenTxs] of tokenGroups) {
      const tokenPnl = await this.calculateTokenPnL(tokenTxs);

      totalRealizedPnl = totalRealizedPnl.plus(tokenPnl.realizedPnl);
      totalUnrealizedPnl = totalUnrealizedPnl.plus(tokenPnl.unrealizedPnl);
      totalCostBasis = totalCostBasis.plus(tokenPnl.costBasis);
      totalCurrentValue = totalCurrentValue.plus(tokenPnl.currentValue);
      transactionCount += tokenTxs.length;
    }

    const totalPnl = totalRealizedPnl.plus(totalUnrealizedPnl);
    const pnlPercentage = totalCostBasis.gt(0)
      ? totalPnl.div(totalCostBasis).mul(100)
      : new Decimal(0);

    return {
      totalRealizedPnl,
      totalUnrealizedPnl,
      totalPnl,
      totalCostBasis,
      totalCurrentValue,
      pnlPercentage,
      transactionCount,
    };
  }

  /**
   * 按代币分组交易
   */
  private groupTransactionsByToken(
    transactions: TransactionHistory[],
  ): Map<string, TransactionHistory[]> {
    const groups = new Map<string, TransactionHistory[]>();

    for (const tx of transactions) {
      const key = `${tx.chainIndex}-${tx.tokenContractAddress || 'native'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      const group = groups.get(key);
      if (group) {
        group.push(tx);
      }
    }

    return groups;
  }

  /**
   * 计算单个代币的 PnL
   */
  private async calculateTokenPnL(transactions: TransactionHistory[]): Promise<{
    realizedPnl: Decimal;
    unrealizedPnl: Decimal;
    costBasis: Decimal;
    currentValue: Decimal;
  }> {
    let realizedPnl = new Decimal(0);
    let unrealizedPnl = new Decimal(0);
    let costBasis = new Decimal(0);
    let currentValue = new Decimal(0);

    // 按时间排序
    transactions.sort((a, b) => a.txTime - b.txTime);

    let currentPosition = new Decimal(0);
    let averageCost = new Decimal(0);

    for (const tx of transactions) {
      if (!tx.amount) continue;

      const isBuy = this.isBuyTransaction(tx);
      const amount = tx.amount;

      if (isBuy) {
        // 买入
        const totalCost = currentPosition
          .mul(averageCost)
          .plus(amount.mul(tx.costBasis || new Decimal(0)));
        currentPosition = currentPosition.plus(amount);
        averageCost = currentPosition.gt(0)
          ? totalCost.div(currentPosition)
          : new Decimal(0);
      } else {
        // 卖出
        if (currentPosition.gt(0)) {
          const sellValue = amount.mul(tx.costBasis || new Decimal(0));
          const costValue = amount.mul(averageCost);
          realizedPnl = realizedPnl.plus(sellValue.minus(costValue));
        }
        currentPosition = currentPosition.minus(amount);
      }
    }

    // 计算未实现盈亏
    if (currentPosition.gt(0)) {
      const currentPrice = await this.getCurrentTokenPrice(
        transactions[0].chainIndex,
        transactions[0].tokenContractAddress,
      );

      if (currentPrice) {
        currentValue = currentPosition.mul(currentPrice);
        costBasis = currentPosition.mul(averageCost);
        unrealizedPnl = currentValue.minus(costBasis);
      }
    }

    return {
      realizedPnl,
      unrealizedPnl,
      costBasis,
      currentValue,
    };
  }

  /**
   * 判断是否为买入交易
   */
  private isBuyTransaction(tx: TransactionHistory): boolean {
    // // 这里需要根据具体的业务逻辑来判断
    // // 简单示例：根据交易类型和地址判断
    // return (
    //   tx.itype === TransactionItype.TOKEN_TRANSFER &&
    //   tx.to.some((output) => output.address === tx.address)
    // );
    return false;
  }

  /**
   * 获取当前代币价格
   */
  private async getCurrentTokenPrice(
    chainIndex: string,
    tokenContractAddress: string,
  ): Promise<Decimal | null> {
    try {
      const token = await this.tokenRepository.findOne({
        where: {
          chainIndex,
          tokenContractAddress,
        },
      });
      return token?.currentPriceUsd || null;
    } catch (error) {
      this.logger.error(
        `Failed to get current price for token ${tokenContractAddress}:`,
        error,
      );
      return null;
    }
  }

  /**
   * 获取代币持仓
   */
  async getTokenPositions(
    address: string,
    chainIndex?: string,
  ): Promise<TokenPosition[]> {
    const queryBuilder = this.transactionHistoryRepository
      .createQueryBuilder('tx')
      .where('tx.address = :address', { address })
      .andWhere('tx.txStatus = :status', { status: TransactionStatus.SUCCESS });

    if (chainIndex) {
      queryBuilder.andWhere('tx.chainIndex = :chainIndex', { chainIndex });
    }

    const transactions = await queryBuilder
      .orderBy('tx.txTime', 'ASC')
      .getMany();

    const tokenGroups = this.groupTransactionsByToken(transactions);
    const positions: TokenPosition[] = [];

    for (const [tokenKey, tokenTxs] of tokenGroups) {
      const [chainIdx, contractAddress] = tokenKey.split('-');
      const tokenPnl = await this.calculateTokenPnL(tokenTxs);

      if (tokenPnl.costBasis.gt(0)) {
        const token = await this.tokenRepository.findOne({
          where: {
            chainIndex: chainIdx,
            tokenContractAddress:
              contractAddress === 'native' ? null : contractAddress,
          },
        });

        positions.push({
          tokenContractAddress: contractAddress,
          symbol: token?.tokenSymbol || 'Unknown',
          chainIndex: chainIdx,
          totalAmount: tokenPnl.costBasis.div(
            tokenPnl.costBasis.div(tokenTxs.length),
          ),
          averageCostBasis: tokenPnl.costBasis.div(tokenTxs.length),
          currentPrice: token?.currentPriceUsd || new Decimal(0),
          currentValue: tokenPnl.currentValue,
          unrealizedPnl: tokenPnl.unrealizedPnl,
          realizedPnl: tokenPnl.realizedPnl,
          totalPnl: tokenPnl.realizedPnl.plus(tokenPnl.unrealizedPnl),
          pnlPercentage: tokenPnl.costBasis.gt(0)
            ? tokenPnl.realizedPnl
                .plus(tokenPnl.unrealizedPnl)
                .div(tokenPnl.costBasis)
                .mul(100)
            : new Decimal(0),
        });
      }
    }

    return positions;
  }

  /**
   * 获取交易统计
   */
  async getTransactionStats(
    address: string,
    chainIndex?: string,
    begin?: Date,
    end?: Date,
  ): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    totalVolume: Decimal;
    totalFees: Decimal;
  }> {
    const queryBuilder = this.transactionHistoryRepository
      .createQueryBuilder('tx')
      .where('tx.address = :address', { address });

    if (chainIndex) {
      queryBuilder.andWhere('tx.chainIndex = :chainIndex', { chainIndex });
    }

    if (begin && end) {
      queryBuilder.andWhere('tx.txTime BETWEEN :begin AND :end', {
        begin: begin.getTime(),
        end: end.getTime(),
      });
    }

    const transactions = await queryBuilder.getMany();

    const stats = {
      totalTransactions: transactions.length,
      successfulTransactions: transactions.filter(
        (tx) => tx.txStatus === TransactionStatus.SUCCESS,
      ).length,
      failedTransactions: transactions.filter(
        (tx) => tx.txStatus === TransactionStatus.FAIL,
      ).length,
      totalVolume: transactions.reduce(
        (sum, tx) => sum.plus(tx.amount || 0),
        new Decimal(0),
      ),
      totalFees: transactions.reduce(
        (sum, tx) => sum.plus(tx.txFee || 0),
        new Decimal(0),
      ),
    };

    return stats;
  }

  private async getRedisLock(key: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      redisClient.set(key, 'locked', 'EX', 60 * 5, 'NX', (err, result) => {
        if (err) {
          reject(err);
        }
        resolve(result === 'OK');
      });
    });
  }

  private formatAddress(address: string) {
    try {
      return ethers.getAddress(address);
    } catch (e) {
      return null;
    }
  }
}
