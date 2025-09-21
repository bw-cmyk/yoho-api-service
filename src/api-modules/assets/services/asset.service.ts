import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Decimal } from 'decimal.js';
import { UserAsset, Currency } from '../entities/user-asset.entity';
import {
  Transaction,
  TransactionType,
  TransactionSource,
  TransactionStatus,
} from '../entities/transaction.entity';
import { UserChainAsset, ChainType } from '../entities/user-chain-asset.entity';
import {
  UserChainAssetSnapshot,
  SnapshotType,
} from '../entities/user-chain-asset-snapshot.entity';
import { WalletService } from 'src/api-modules/user/service/wallet.service';

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

    private readonly dataSource: DataSource,

    private readonly walletService: WalletService,
  ) {}

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
      // 获取或创建用户资产
      let asset = await manager.findOne(UserAsset, {
        where: { userId: userId, currency },
      });

      if (!asset) {
        asset = manager.create(UserAsset, {
          userId: userId,
          currency,
          balanceReal: new Decimal(0),
          balanceBonus: new Decimal(0),
          balanceLocked: new Decimal(0),
        });
      }

      const balanceBefore = asset.balanceReal;
      asset.balanceReal = asset.balanceReal.plus(amount);
      await manager.save(asset);

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
        await manager.save(asset);

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
      const asset = await this.getUserAsset(userId, currency);

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

      await manager.save(asset);

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
      const asset = await this.getUserAsset(userId, currency);

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

      await manager.save(asset);

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
      const asset = await this.getUserAsset(userId, currency);

      if (!asset.hasEnoughWithdrawableBalance(amount)) {
        throw new BadRequestException(
          `可提现余额不足，需要 ${amount} ${currency}，可提现余额 ${asset.withdrawableBalance} ${currency}`,
        );
      }

      const balanceBefore = asset.balanceReal;
      asset.balanceReal = asset.balanceReal.minus(amount);
      await manager.save(asset);

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
      const asset = await this.getUserAsset(userId, currency);

      if (!asset.hasEnoughBalance(amount)) {
        throw new BadRequestException(
          `可用余额不足，无法锁定 ${amount} ${currency}`,
        );
      }

      asset.balanceLocked = asset.balanceLocked.plus(amount);
      await manager.save(asset);

      // 创建锁定交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId: userId,
        currency,
        type: TransactionType.LOCK,
        source: TransactionSource.LOCKED,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: asset.balanceLocked.minus(amount),
        balance_after: asset.balanceLocked,
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
      const asset = await this.getUserAsset(userId, currency);

      if (asset.balanceLocked.lt(amount)) {
        throw new BadRequestException(
          `锁定余额不足，无法解锁 ${amount} ${currency}`,
        );
      }

      asset.balanceLocked = asset.balanceLocked.minus(amount);
      await manager.save(asset);

      // 创建解锁交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        userId: userId,
        currency,
        type: TransactionType.UNLOCK,
        source: TransactionSource.LOCKED,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: asset.balanceLocked.plus(amount),
        balance_after: asset.balanceLocked,
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
      const universalAccount = await this.walletService.getUniversalAccount(
        userId,
      );
      const primaryAssets = await universalAccount.getPrimaryAssets();
      console.log('primaryAssets', primaryAssets);

      const updatedAssets: UserChainAsset[] = [];

      // 确保primaryAssets是数组
      const assetsArray = Array.isArray(primaryAssets.assets)
        ? primaryAssets.assets
        : [];

      for (const asset of assetsArray) {
        const chainAsset = await this.updateOrCreateChainAsset(userId, asset);
        updatedAssets.push(chainAsset);
      }

      this.logger.log(
        `用户 ${userId} 链上资产更新完成，共更新 ${updatedAssets.length} 个资产`,
      );
      return updatedAssets;
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
        tokenDecimals: assetData.decimals || 18,
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
  private mapChainType(chain: string): ChainType {
    const chainMap: Record<string, ChainType> = {
      ethereum: ChainType.EVM,
      polygon: ChainType.EVM,
      bsc: ChainType.EVM,
      arbitrum: ChainType.EVM,
      optimism: ChainType.EVM,
      avalanche: ChainType.EVM,
      solana: ChainType.SOLANA,
      bitcoin: ChainType.BITCOIN,
    };

    return chainMap.bsc;
  }

  /**
   * 获取用户链上资产
   */
  async getUserChainAssets(userId: string): Promise<UserChainAsset[]> {
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
}
