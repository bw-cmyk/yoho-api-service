import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { UserAsset, Currency } from '../entities/balance/user-asset.entity';
import {
  Transaction,
  TransactionType,
  TransactionSource,
  TransactionStatus,
} from '../entities/balance/transaction.entity';
import {
  UserChainAsset,
  ChainType,
} from '../entities/onchain/user-chain-asset.entity';
import {
  UserChainAssetSnapshot,
  SnapshotType,
} from '../entities/onchain/user-chain-asset-snapshot.entity';
import { WalletService } from 'src/api-modules/user/service/wallet.service';
import { OKXQueueService } from '../dex/okx-queue.service';
import { OKX_ALL_CHAIN_ASSETS_CALLBACK_FUNCTION_ID } from '../constants';
import { RedisQueueService } from 'src/common-modules/queue/redis-queue.service';

export interface DepositRequest {
  userId: string;
  currency: Currency;
  amount: Decimal;
  reference_id?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface BetRequest {
  userId: string;
  currency: Currency;
  amount: Decimal;
  game_id: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface WinRequest {
  userId: string;
  currency: Currency;
  amount: Decimal;
  game_id: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface WithdrawRequest {
  userId: string;
  currency: Currency;
  amount: Decimal;
  reference_id?: string;
  description?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    @InjectRepository(UserAsset)
    private readonly userAssetRepository: Repository<UserAsset>,

    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,

    @InjectRepository(UserChainAsset)
    private readonly userChainAssetRepository: Repository<UserChainAsset>,

    @InjectRepository(UserChainAssetSnapshot)
    private readonly userChainAssetSnapshotRepository: Repository<UserChainAssetSnapshot>,

    private readonly okxQueueService: OKXQueueService,

    private readonly dataSource: DataSource,

    private readonly walletService: WalletService,

    private readonly queueService: RedisQueueService,
  ) {
    this.queueService.registerCallbackFunction(
      OKX_ALL_CHAIN_ASSETS_CALLBACK_FUNCTION_ID,
      this.updateUserChainAssetsCallback.bind(this),
    );
  }

  /**
   * 获取用户资产
   */
  async getUserAsset(userId: string, currency: Currency): Promise<UserAsset> {
    let asset = await this.userAssetRepository.findOne({
      where: { userId: userId, currency },
    });

    if (!asset) {
      // 如果资产不存在，创建新的资产记录
      asset = this.userAssetRepository.create({
        userId: userId,
        currency,
        balanceReal: new Decimal(0),
        balanceBonus: new Decimal(0),
        balanceLocked: new Decimal(0),
      });
      await this.userAssetRepository.save(asset);
    }

    return asset;
  }

  /**
   * 获取用户所有币种资产
   */
  async getUserAssets(userId: string): Promise<UserAsset[]> {
    return this.userAssetRepository.find({
      where: { userId: userId },
      order: { currency: 'ASC' },
    });
  }

  /**
   * 充值处理
   */
  async deposit(
    request: DepositRequest,
  ): Promise<{ asset: UserAsset; transactions: Transaction[] }> {
    const { userId, currency, amount, reference_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('充值金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 检查 reference_id 是否已存在，防止重复处理
      if (reference_id) {
        const existingTransaction = await manager.findOne(Transaction, {
          where: { reference_id: reference_id },
        });
        if (existingTransaction) {
          this.logger.warn(
            `Deposit with reference_id ${reference_id} already exists`,
          );
          // 返回已存在的交易记录，确保幂等性
          const existingAsset = await manager.findOne(UserAsset, {
            where: { userId: userId, currency },
          });
          return {
            asset: existingAsset,
            transactions: [existingTransaction],
          };
        }
      }

      // 使用悲观锁获取用户资产，防止并发修改
      let asset = await manager.findOne(UserAsset, {
        where: { userId: userId, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!asset) {
        // 创建新资产时也需要锁保护
        asset = manager.create(UserAsset, {
          userId: userId,
          currency,
          balanceReal: new Decimal(0),
          balanceBonus: new Decimal(0),
          balanceLocked: new Decimal(0),
          version: 1,
        });
      }

      const balanceBefore = asset.balanceReal;
      asset.balanceReal = asset.balanceReal.plus(amount);

      try {
        await manager.save(asset);
      } catch (error) {
        // 处理乐观锁冲突
        if (error.code === '23505' || error.message.includes('version')) {
          this.logger.warn(
            `Optimistic lock conflict for user ${userId} currency ${currency}`,
          );
          throw new BadRequestException(
            'Concurrent update detected, please retry',
          );
        }
        throw error;
      }

      // 创建充值交易记录
      const depositTransaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId: userId,
        currency,
        type: TransactionType.DEPOSIT,
        source: TransactionSource.REAL,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: balanceBefore,
        balance_after: asset.balanceReal,
        reference_id,
        description: description || `充值 ${amount} ${currency}`,
        metadata,
        processed_at: new Date(),
      });

      await manager.save(depositTransaction);

      // 检查是否需要发放赠金（这里可以根据业务规则配置）
      const bonusAmount = await this.calculateBonusAmount(amount);
      const transactions = [depositTransaction];

      if (bonusAmount.gt(0)) {
        const bonusBefore = asset.balanceBonus;
        asset.balanceBonus = asset.balanceBonus.plus(bonusAmount);

        try {
          await manager.save(asset);
        } catch (error) {
          // 处理赠金更新的乐观锁冲突
          if (error.code === '23505' || error.message.includes('version')) {
            this.logger.warn(
              `Optimistic lock conflict for bonus update user ${userId} currency ${currency}`,
            );
            throw new BadRequestException(
              'Concurrent update detected during bonus processing, please retry',
            );
          }
          throw error;
        }

        // 创建赠金交易记录
        const bonusTransaction = manager.create(Transaction, {
          transaction_id: Transaction.generateTransactionId(),
          userId: userId,
          currency,
          type: TransactionType.BONUS_GRANT,
          source: TransactionSource.BONUS,
          status: TransactionStatus.SUCCESS,
          amount: bonusAmount,
          balance_before: bonusBefore,
          balance_after: asset.balanceBonus,
          reference_id: depositTransaction.transaction_id,
          description: `充值赠金 ${bonusAmount} ${currency}`,
          metadata: {
            deposit_transaction_id: depositTransaction.transaction_id,
          },
          processed_at: new Date(),
        });

        await manager.save(bonusTransaction);
        transactions.push(bonusTransaction);
      }

      this.logger.log(
        `用户 ${userId} 充值成功: ${amount} ${currency}, 赠金: ${bonusAmount} ${currency}`,
      );

      return { asset, transactions };
    });
  }

  /**
   * 游戏下注
   */
  async bet(
    request: BetRequest,
  ): Promise<{ asset: UserAsset; transaction: Transaction }> {
    const { userId, currency, amount, game_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('下注金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 使用悲观锁获取用户资产，防止并发修改
      const asset = await manager.findOne(UserAsset, {
        where: { userId: userId, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!asset) {
        throw new BadRequestException(`用户资产不存在: ${userId} ${currency}`);
      }

      if (!asset.hasEnoughBalance(amount)) {
        throw new BadRequestException(
          `余额不足，需要 ${amount} ${currency}，可用余额 ${asset.availableBalance} ${currency}`,
        );
      }

      // 计算扣款策略：优先扣赠金，不足部分扣真实余额
      const { realAmount, bonusAmount } = this.calculateBetDeduction(
        asset,
        amount,
      );

      const balanceBefore = asset.balanceReal;
      const bonusBefore = asset.balanceBonus;

      // 扣款
      if (realAmount.gt(0)) {
        asset.balanceReal = asset.balanceReal.minus(realAmount);
      }
      if (bonusAmount.gt(0)) {
        asset.balanceBonus = asset.balanceBonus.minus(bonusAmount);
      }

      try {
        await manager.save(asset);
      } catch (error) {
        // 处理乐观锁冲突
        if (error.code === '23505' || error.message.includes('version')) {
          this.logger.warn(
            `Optimistic lock conflict for bet user ${userId} currency ${currency}`,
          );
          throw new BadRequestException(
            'Concurrent update detected during bet, please retry',
          );
        }
        throw error;
      }

      // 创建下注交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId,
        currency,
        type: TransactionType.GAME_BET,
        source: bonusAmount.gt(0)
          ? TransactionSource.BONUS
          : TransactionSource.REAL,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: bonusAmount.gt(0) ? bonusBefore : balanceBefore,
        balance_after: bonusAmount.gt(0)
          ? asset.balanceBonus
          : asset.balanceReal,
        reference_id: game_id,
        description: description || `游戏下注 ${amount} ${currency}`,
        metadata: {
          ...metadata,
          game_id,
          real_amount: realAmount.toString(),
          bonus_amount: bonusAmount.toString(),
        },
        processed_at: new Date(),
      });

      console.log('transaction: ', transaction);

      await manager.save(transaction);

      this.logger.log(
        `用户 ${userId} 下注成功: ${amount} ${currency} (真实: ${realAmount}, 赠金: ${bonusAmount})`,
      );

      return { asset, transaction };
    });
  }

  /**
   * 游戏中奖
   */
  async win(
    request: WinRequest,
  ): Promise<{ asset: UserAsset; transaction: Transaction }> {
    const { userId, currency, amount, game_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('中奖金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 使用悲观锁获取用户资产，防止并发修改
      const asset = await manager.findOne(UserAsset, {
        where: { userId: userId, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!asset) {
        throw new BadRequestException(`用户资产不存在: ${userId} ${currency}`);
      }

      // 根据策略决定收益进入哪个账户（这里使用保守策略：优先进入赠金账户）
      const targetSource = await this.determineWinTarget(asset);
      const balanceBefore =
        targetSource === TransactionSource.BONUS
          ? asset.balanceBonus
          : asset.balanceReal;

      // 增加余额
      if (targetSource === TransactionSource.BONUS) {
        asset.balanceBonus = asset.balanceBonus.plus(amount);
      } else {
        asset.balanceReal = asset.balanceReal.plus(amount);
      }

      try {
        await manager.save(asset);
      } catch (error) {
        // 处理乐观锁冲突
        if (error.code === '23505' || error.message.includes('version')) {
          this.logger.warn(
            `Optimistic lock conflict for win user ${userId} currency ${currency}`,
          );
          throw new BadRequestException(
            'Concurrent update detected during win, please retry',
          );
        }
        throw error;
      }

      // 创建中奖交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId: userId,
        currency,
        type: TransactionType.GAME_WIN,
        source: targetSource,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: balanceBefore,
        balance_after:
          targetSource === TransactionSource.BONUS
            ? asset.balanceBonus
            : asset.balanceReal,
        reference_id: game_id,
        description: description || `游戏中奖 ${amount} ${currency}`,
        metadata: {
          ...metadata,
          game_id,
          target_source: targetSource,
        },
        processed_at: new Date(),
      });

      await manager.save(transaction);

      this.logger.log(
        `用户 ${userId} 中奖: ${amount} ${currency} (进入${
          targetSource === TransactionSource.BONUS ? '赠金' : '真实'
        }账户)`,
      );

      return { asset, transaction };
    });
  }

  /**
   * 提现
   */
  async withdraw(
    request: WithdrawRequest,
  ): Promise<{ asset: UserAsset; transaction: Transaction }> {
    const { userId, currency, amount, reference_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('提现金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 使用悲观锁获取用户资产，防止并发修改
      const asset = await manager.findOne(UserAsset, {
        where: { userId: userId, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!asset) {
        throw new BadRequestException(`用户资产不存在: ${userId} ${currency}`);
      }

      if (!asset.balanceLocked.gte(amount)) {
        throw new BadRequestException(
          `可提现余额不足，需要 ${amount} ${currency}，可提现余额 ${asset.balanceLocked} ${currency}`,
        );
      }

      const balanceBefore = asset.balanceReal;
      asset.balanceLocked = asset.balanceLocked.minus(amount);

      try {
        await manager.save(asset);
      } catch (error) {
        // 处理乐观锁冲突
        if (error.code === '23505' || error.message.includes('version')) {
          this.logger.warn(
            `Optimistic lock conflict for withdraw user ${userId} currency ${currency}`,
          );
          throw new BadRequestException(
            'Concurrent update detected during withdraw, please retry',
          );
        }
        throw error;
      }

      // 创建提现交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId: userId,
        currency,
        type: TransactionType.WITHDRAW,
        source: TransactionSource.REAL,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: balanceBefore,
        balance_after: asset.balanceReal,
        reference_id,
        description: description || `提现 ${amount} ${currency}`,
        metadata,
        processed_at: new Date(),
      });

      await manager.save(transaction);

      this.logger.log(`用户 ${userId} 提现成功: ${amount} ${currency}`);

      return { asset, transaction };
    });
  }

  /**
   * 锁定余额（用于游戏进行中）
   */
  async lockBalance(
    userId: string,
    currency: Currency,
    amount: Decimal,
    reference_id: string,
  ): Promise<UserAsset> {
    if (amount.lte(0)) {
      throw new BadRequestException('锁定金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 使用悲观锁获取用户资产，防止并发修改
      const asset = await manager.findOne(UserAsset, {
        where: { userId: userId, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!asset) {
        throw new BadRequestException(`用户资产不存在: ${userId} ${currency}`);
      }

      if (!asset.hasEnoughWithdrawableBalance(amount)) {
        throw new BadRequestException(
          `真实余额不足，无法锁定 ${amount} ${currency}，真实余额 ${asset.balanceReal} ${currency}`,
        );
      }

      // 从真实余额扣除，增加到锁定余额
      asset.balanceReal = asset.balanceReal.minus(amount);
      asset.balanceLocked = asset.balanceLocked.plus(amount);

      try {
        await manager.save(asset);
      } catch (error) {
        // 处理乐观锁冲突
        if (error.code === '23505' || error.message.includes('version')) {
          this.logger.warn(
            `Optimistic lock conflict for lock balance user ${userId} currency ${currency}`,
          );
          throw new BadRequestException(
            'Concurrent update detected during lock balance, please retry',
          );
        }
        throw error;
      }

      // 创建锁定交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId: userId,
        currency,
        type: TransactionType.LOCK,
        source: TransactionSource.REAL,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: asset.balanceReal.plus(amount),
        balance_after: asset.balanceReal,
        reference_id,
        description: `锁定余额 ${amount} ${currency}`,
        processed_at: new Date(),
      });

      await manager.save(transaction);

      return asset;
    });
  }

  /**
   * 解锁余额
   */
  async unlockBalance(
    userId: string,
    currency: Currency,
    amount: Decimal,
    reference_id: string,
  ): Promise<UserAsset> {
    if (amount.lte(0)) {
      throw new BadRequestException('解锁金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 使用悲观锁获取用户资产，防止并发修改
      const asset = await manager.findOne(UserAsset, {
        where: { userId: userId, currency },
        lock: { mode: 'pessimistic_write' },
      });

      if (!asset) {
        throw new BadRequestException(`用户资产不存在: ${userId} ${currency}`);
      }

      if (asset.balanceLocked.lt(amount)) {
        throw new BadRequestException(
          `锁定余额不足，无法解锁 ${amount} ${currency}，锁定余额 ${asset.balanceLocked} ${currency}`,
        );
      }

      // 从锁定余额扣除，增加回真实余额
      asset.balanceLocked = asset.balanceLocked.minus(amount);
      asset.balanceReal = asset.balanceReal.plus(amount);

      try {
        await manager.save(asset);
      } catch (error) {
        // 处理乐观锁冲突
        if (error.code === '23505' || error.message.includes('version')) {
          this.logger.warn(
            `Optimistic lock conflict for unlock balance user ${userId} currency ${currency}`,
          );
          throw new BadRequestException(
            'Concurrent update detected during unlock balance, please retry',
          );
        }
        throw error;
      }

      // 创建解锁交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId: userId,
        currency,
        type: TransactionType.UNLOCK,
        source: TransactionSource.LOCKED,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: asset.balanceReal.minus(amount),
        balance_after: asset.balanceReal,
        reference_id,
        description: `解锁余额 ${amount} ${currency}`,
        processed_at: new Date(),
      });

      await manager.save(transaction);

      return asset;
    });
  }

  /**
   * 获取用户交易历史
   */
  async getTransactionHistory(
    userId: string,
    currency?: Currency,
    page = 1,
    limit = 20,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.user_id = :userId', { userId })
      .orderBy('transaction.created_at', 'DESC');

    if (currency) {
      query.andWhere('transaction.currency = :currency', { currency });
    }

    const [transactions, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { transactions, total };
  }

  /**
   * 计算赠金金额（可以根据业务规则配置）
   */
  private async calculateBonusAmount(depositAmount: Decimal): Promise<Decimal> {
    // 示例：充值100U送10U赠金
    const bonusRatio = new Decimal('0.1'); // 10%
    return depositAmount.mul(bonusRatio).toDecimalPlaces(8);
  }

  /**
   * 计算下注扣款策略
   */
  private calculateBetDeduction(
    asset: UserAsset,
    amount: Decimal,
  ): { realAmount: Decimal; bonusAmount: Decimal } {
    let bonusAmount = new Decimal(0);
    let realAmount = new Decimal(0);

    // 优先使用赠金
    if (asset.balanceBonus.gt(0)) {
      bonusAmount = Decimal.min(asset.balanceBonus, amount);
      realAmount = amount.minus(bonusAmount);
    } else {
      realAmount = amount;
    }

    return { realAmount, bonusAmount };
  }

  /**
   * 确定中奖收益的目标账户
   */
  private async determineWinTarget(
    asset: UserAsset,
  ): Promise<TransactionSource> {
    // 保守策略：如果还有赠金余额，收益进入赠金账户
    if (asset.balanceBonus.gt(0)) {
      return TransactionSource.BONUS;
    }

    // 否则进入真实账户
    return TransactionSource.REAL;
  }

  async updateUserChainAssets(userId: string): Promise<UserChainAsset[]> {
    try {
      // get user address
      const userAddress = await this.walletService.getAAWallet(userId);
      console.log('userAddress: ', userAddress);
      await this.okxQueueService.getAllChainAssets(
        {
          address: userAddress,
          chains: '56',
          excludeRiskToken: '0',
        },
        OKX_ALL_CHAIN_ASSETS_CALLBACK_FUNCTION_ID,
        1,
      );

      return [];
    } catch (error) {
      this.logger.error(`更新用户 ${userId} 链上资产失败:`, error);
      throw new BadRequestException('更新链上资产失败');
    }
  }

  /**
   * 更新或创建单个链上资产
   */
  private async updateOrCreateChainAsset(
    userId: string,
    assetData: any,
  ): Promise<UserChainAsset> {
    const tokenSymbol = assetData.tokenType;
    const price = assetData.price;
    const amount = assetData.amount;
    const amountInUSD = assetData.amountInUSD;

    // 查找现有资产
    let chainAsset = await this.userChainAssetRepository.findOne({
      where: {
        userId,
        tokenSymbol: tokenSymbol,
      },
    });

    const balance = new Decimal(amount || '0');
    const priceUsd = new Decimal(price || '0');
    const usdValue = amountInUSD;

    if (chainAsset) {
      // 更新现有资产
      chainAsset.balance = balance;
      chainAsset.usdValue = usdValue;
      chainAsset.priceUsd = priceUsd;
      chainAsset.lastUpdatedAt = new Date();
    } else {
      // 创建新资产
      chainAsset = this.userChainAssetRepository.create({
        userId,
        tokenSymbol: tokenSymbol,
        tokenName: tokenSymbol,
        balance,
        usdValue,
        priceUsd,
        lastUpdatedAt: new Date(),
      });
    }

    return await this.userChainAssetRepository.save(chainAsset);
  }

  /**
   * 映射链类型
   */
  private mapChainType(): ChainType {
    return ChainType.EVM;
  }

  /**
   * 获取用户链上资产
   */
  async getUserChainAssets(userId: string): Promise<UserChainAsset[]> {
    this.updateUserChainAssets(userId);
    return this.userChainAssetRepository.find({
      where: { userId },
      order: { usdValue: 'DESC' },
    });
  }

  /**
   * 获取用户链上资产总价值
   */
  async getUserChainAssetsTotalValue(userId: string): Promise<Decimal> {
    const assets = await this.getUserChainAssets(userId);
    return assets.reduce(
      (total, asset) => total.plus(asset.usdValue),
      new Decimal(0),
    );
  }

  /**
   * 创建链上资产快照
   */
  async createChainAssetSnapshot(
    userId: string,
    snapshotType: SnapshotType = SnapshotType.MANUAL,
    snapshotDate?: Date,
  ): Promise<UserChainAssetSnapshot[]> {
    const date = snapshotDate || new Date();
    const assets = await this.getUserChainAssets(userId);

    const snapshots: UserChainAssetSnapshot[] = [];

    for (const asset of assets) {
      const snapshotData = UserChainAssetSnapshot.createFromChainAsset(
        asset,
        userId,
        snapshotType,
        date,
        {
          source: 'manual_snapshot',
          total_assets: assets.length,
        },
      );

      const snapshot =
        this.userChainAssetSnapshotRepository.create(snapshotData);
      snapshots.push(
        await this.userChainAssetSnapshotRepository.save(snapshot),
      );
    }

    this.logger.log(
      `用户 ${userId} 创建链上资产快照完成，共快照 ${snapshots.length} 个资产`,
    );
    return snapshots;
  }

  /**
   * 获取用户链上资产快照历史
   */
  async getUserChainAssetSnapshots(
    userId: string,
    snapshotType?: SnapshotType,
    page = 1,
    limit = 20,
  ): Promise<{ snapshots: UserChainAssetSnapshot[]; total: number }> {
    const query = this.userChainAssetSnapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.user_id = :userId', { userId })
      .orderBy('snapshot.snapshot_date', 'DESC')
      .addOrderBy('snapshot.created_at', 'DESC');

    if (snapshotType) {
      query.andWhere('snapshot.snapshot_type = :snapshotType', {
        snapshotType,
      });
    }

    const [snapshots, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { snapshots, total };
  }

  /**
   * 获取用户指定日期的链上资产快照
   */
  async getUserChainAssetSnapshotByDate(
    userId: string,
    date: Date,
    snapshotType?: SnapshotType,
  ): Promise<UserChainAssetSnapshot[]> {
    const query = this.userChainAssetSnapshotRepository
      .createQueryBuilder('snapshot')
      .where('snapshot.user_id = :userId', { userId })
      .andWhere('DATE(snapshot.snapshot_date) = DATE(:date)', { date })
      .orderBy('snapshot.usd_value', 'DESC');

    if (snapshotType) {
      query.andWhere('snapshot.snapshot_type = :snapshotType', {
        snapshotType,
      });
    }

    return query.getMany();
  }

  /**
   * 批量更新多个用户的链上资产
   */
  async batchUpdateChainAssets(
    userIds: string[],
  ): Promise<Record<string, UserChainAsset[]>> {
    const results: Record<string, UserChainAsset[]> = {};

    for (const userId of userIds) {
      try {
        const assets = await this.updateUserChainAssets(userId);
        results[userId] = assets;
      } catch (error) {
        this.logger.error(`批量更新用户 ${userId} 链上资产失败:`, error);
        results[userId] = [];
      }
    }

    return results;
  }

  async updateUserChainAssetsCallback(result: any, requestParams: any) {
    const tokens = result[0]?.tokenAssets;
    const userAddress = requestParams.queryParams.address;

    console.log('tokens: ', requestParams);
    // get user id
    const user = await this.walletService.getUserByAddress(userAddress);
    if (!tokens || !user) {
      return;
    }
    for (const token of tokens) {
      await this.updateOrCreateChainAsset(user.id, {
        tokenType: token.symbol,
        price: token.tokenPrice,
        amount: token.balance,
        amountInUSD: parseFloat(token.balance) * parseFloat(token.tokenPrice),
        decimals: token.decimals,
      });
    }
  }
  
}
