import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';

export enum AssetType {
  REAL = 'REAL',
  BONUS = 'BONUS',
  LOCKED = 'LOCKED',
}

export enum Currency {
  USD = 'USD',
  USDT = 'USDT',
  BTC = 'BTC',
  ETH = 'ETH',
  // 可以根据需要添加更多币种
}

@Entity('yoho_user_assets')
@Index(['user_id', 'currency'], { unique: true })
export class UserAsset {
  @PrimaryColumn({ type: 'bigint' })
  user_id: number;

  @PrimaryColumn({ type: 'varchar', length: 10 })
  currency: Currency;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  balance_real: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  balance_bonus: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  balance_locked: Decimal;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  /**
   * 获取总可用余额（真实余额 + 赠金余额）
   */
  get totalBalance(): Decimal {
    return this.balance_real.plus(this.balance_bonus);
  }

  /**
   * 获取可提现余额（仅真实余额）
   */
  get withdrawableBalance(): Decimal {
    return this.balance_real;
  }

  /**
   * 获取可用余额（总余额 - 锁定余额）
   */
  get availableBalance(): Decimal {
    return this.totalBalance.minus(this.balance_locked);
  }

  /**
   * 检查是否有足够的余额进行下注
   */
  hasEnoughBalance(amount: Decimal): boolean {
    return this.availableBalance.gte(amount);
  }

  /**
   * 检查是否有足够的真实余额进行提现
   */
  hasEnoughWithdrawableBalance(amount: Decimal): boolean {
    return this.withdrawableBalance.gte(amount);
  }

  /**
   * 获取余额详情
   */
  getBalanceDetails() {
    return {
      real: this.balance_real,
      bonus: this.balance_bonus,
      locked: this.balance_locked,
      total: this.totalBalance,
      withdrawable: this.withdrawableBalance,
      available: this.availableBalance,
    };
  }
}
