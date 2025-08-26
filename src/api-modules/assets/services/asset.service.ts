import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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

export interface DepositRequest {
  user_id: number;
  currency: Currency;
  amount: Decimal;
  reference_id?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface BetRequest {
  user_id: number;
  currency: Currency;
  amount: Decimal;
  game_id: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface WinRequest {
  user_id: number;
  currency: Currency;
  amount: Decimal;
  game_id: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface WithdrawRequest {
  user_id: number;
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
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 获取用户资产
   */
  async getUserAsset(user_id: number, currency: Currency): Promise<UserAsset> {
    let asset = await this.userAssetRepository.findOne({
      where: { user_id, currency },
    });

    if (!asset) {
      // 如果资产不存在，创建新的资产记录
      asset = this.userAssetRepository.create({
        user_id,
        currency,
        balance_real: new Decimal(0),
        balance_bonus: new Decimal(0),
        balance_locked: new Decimal(0),
      });
      await this.userAssetRepository.save(asset);
    }

    return asset;
  }

  /**
   * 获取用户所有币种资产
   */
  async getUserAssets(user_id: number): Promise<UserAsset[]> {
    return this.userAssetRepository.find({
      where: { user_id },
      order: { currency: 'ASC' },
    });
  }

  /**
   * 充值处理
   */
  async deposit(
    request: DepositRequest,
  ): Promise<{ asset: UserAsset; transactions: Transaction[] }> {
    const { user_id, currency, amount, reference_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('充值金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      // 获取或创建用户资产
      let asset = await manager.findOne(UserAsset, {
        where: { user_id, currency },
      });

      if (!asset) {
        asset = manager.create(UserAsset, {
          user_id,
          currency,
          balance_real: new Decimal(0),
          balance_bonus: new Decimal(0),
          balance_locked: new Decimal(0),
        });
      }

      const balanceBefore = asset.balance_real;
      asset.balance_real = asset.balance_real.plus(amount);
      await manager.save(asset);

      // 创建充值交易记录
      const depositTransaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        user_id,
        currency,
        type: TransactionType.DEPOSIT,
        source: TransactionSource.REAL,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: balanceBefore,
        balance_after: asset.balance_real,
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
        const bonusBefore = asset.balance_bonus;
        asset.balance_bonus = asset.balance_bonus.plus(bonusAmount);
        await manager.save(asset);

        // 创建赠金交易记录
        const bonusTransaction = manager.create(Transaction, {
          transaction_id: Transaction.generateTransactionId(),
          user_id,
          currency,
          type: TransactionType.BONUS_GRANT,
          source: TransactionSource.BONUS,
          status: TransactionStatus.SUCCESS,
          amount: bonusAmount,
          balance_before: bonusBefore,
          balance_after: asset.balance_bonus,
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
        `用户 ${user_id} 充值成功: ${amount} ${currency}, 赠金: ${bonusAmount} ${currency}`,
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
    const { user_id, currency, amount, game_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('下注金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      const asset = await this.getUserAsset(user_id, currency);

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

      const balanceBefore = asset.balance_real;
      const bonusBefore = asset.balance_bonus;

      // 扣款
      if (realAmount.gt(0)) {
        asset.balance_real = asset.balance_real.minus(realAmount);
      }
      if (bonusAmount.gt(0)) {
        asset.balance_bonus = asset.balance_bonus.minus(bonusAmount);
      }

      await manager.save(asset);

      // 创建下注交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        user_id,
        currency,
        type: TransactionType.GAME_BET,
        source: bonusAmount.gt(0)
          ? TransactionSource.BONUS
          : TransactionSource.REAL,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: bonusAmount.gt(0) ? bonusBefore : balanceBefore,
        balance_after: bonusAmount.gt(0)
          ? asset.balance_bonus
          : asset.balance_real,
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
        `用户 ${user_id} 下注成功: ${amount} ${currency} (真实: ${realAmount}, 赠金: ${bonusAmount})`,
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
    const { user_id, currency, amount, game_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('中奖金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      const asset = await this.getUserAsset(user_id, currency);

      // 根据策略决定收益进入哪个账户（这里使用保守策略：优先进入赠金账户）
      const targetSource = await this.determineWinTarget(asset, amount);
      const balanceBefore =
        targetSource === TransactionSource.BONUS
          ? asset.balance_bonus
          : asset.balance_real;

      // 增加余额
      if (targetSource === TransactionSource.BONUS) {
        asset.balance_bonus = asset.balance_bonus.plus(amount);
      } else {
        asset.balance_real = asset.balance_real.plus(amount);
      }

      await manager.save(asset);

      // 创建中奖交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        user_id,
        currency,
        type: TransactionType.GAME_WIN,
        source: targetSource,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: balanceBefore,
        balance_after:
          targetSource === TransactionSource.BONUS
            ? asset.balance_bonus
            : asset.balance_real,
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
        `用户 ${user_id} 中奖: ${amount} ${currency} (进入${
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
    const { user_id, currency, amount, reference_id, description, metadata } =
      request;

    if (amount.lte(0)) {
      throw new BadRequestException('提现金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      const asset = await this.getUserAsset(user_id, currency);

      if (!asset.hasEnoughWithdrawableBalance(amount)) {
        throw new BadRequestException(
          `可提现余额不足，需要 ${amount} ${currency}，可提现余额 ${asset.withdrawableBalance} ${currency}`,
        );
      }

      const balanceBefore = asset.balance_real;
      asset.balance_real = asset.balance_real.minus(amount);
      await manager.save(asset);

      // 创建提现交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        user_id,
        currency,
        type: TransactionType.WITHDRAW,
        source: TransactionSource.REAL,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: balanceBefore,
        balance_after: asset.balance_real,
        reference_id,
        description: description || `提现 ${amount} ${currency}`,
        metadata,
        processed_at: new Date(),
      });

      await manager.save(transaction);

      this.logger.log(`用户 ${user_id} 提现成功: ${amount} ${currency}`);

      return { asset, transaction };
    });
  }

  /**
   * 锁定余额（用于游戏进行中）
   */
  async lockBalance(
    user_id: number,
    currency: Currency,
    amount: Decimal,
    reference_id: string,
  ): Promise<UserAsset> {
    if (amount.lte(0)) {
      throw new BadRequestException('锁定金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      const asset = await this.getUserAsset(user_id, currency);

      if (!asset.hasEnoughBalance(amount)) {
        throw new BadRequestException(
          `可用余额不足，无法锁定 ${amount} ${currency}`,
        );
      }

      asset.balance_locked = asset.balance_locked.plus(amount);
      await manager.save(asset);

      // 创建锁定交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        user_id,
        currency,
        type: TransactionType.LOCK,
        source: TransactionSource.LOCKED,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: asset.balance_locked.minus(amount),
        balance_after: asset.balance_locked,
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
    user_id: number,
    currency: Currency,
    amount: Decimal,
    reference_id: string,
  ): Promise<UserAsset> {
    if (amount.lte(0)) {
      throw new BadRequestException('解锁金额必须大于0');
    }

    return await this.dataSource.transaction(async (manager) => {
      const asset = await this.getUserAsset(user_id, currency);

      if (asset.balance_locked.lt(amount)) {
        throw new BadRequestException(
          `锁定余额不足，无法解锁 ${amount} ${currency}`,
        );
      }

      asset.balance_locked = asset.balance_locked.minus(amount);
      await manager.save(asset);

      // 创建解锁交易记录
      const transaction = manager.create(Transaction, {
        transaction_id: Transaction.generateTransactionId(),
        user_id,
        currency,
        type: TransactionType.UNLOCK,
        source: TransactionSource.LOCKED,
        status: TransactionStatus.SUCCESS,
        amount,
        balance_before: asset.balance_locked.plus(amount),
        balance_after: asset.balance_locked,
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
    user_id: number,
    currency?: Currency,
    page = 1,
    limit = 20,
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const query = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.user_id = :user_id', { user_id })
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
    if (asset.balance_bonus.gt(0)) {
      bonusAmount = Decimal.min(asset.balance_bonus, amount);
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
    amount: Decimal,
  ): Promise<TransactionSource> {
    // 保守策略：如果还有赠金余额，收益进入赠金账户
    if (asset.balance_bonus.gt(0)) {
      return TransactionSource.BONUS;
    }

    // 否则进入真实账户
    return TransactionSource.REAL;
  }
}
