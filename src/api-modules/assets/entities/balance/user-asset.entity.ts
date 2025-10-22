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
  // 可以根据需要添加更多币种
}

@Entity('yoho_user_assets')
@Index(['userId', 'currency'], { unique: true })
export class UserAsset {
  @PrimaryColumn({
    name: 'user_id',
  })
  userId: string;

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
    name: 'balance_real',
  })
  balanceReal: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'balance_bonus',
  })
  balanceBonus: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'balance_locked',
  })
  balanceLocked: Decimal;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  /**
   * 获取总可用余额（真实余额 + 赠金余额）
   */
  get totalBalance(): Decimal {
    return this.balanceReal.plus(this.balanceBonus);
  }

  /**
   * 获取可提现余额（仅真实余额）
   */
  get withdrawableBalance(): Decimal {
    return this.balanceReal;
  }

  /**
   * 获取可用余额（总余额 - 锁定余额）
   */
  get availableBalance(): Decimal {
    return this.totalBalance.minus(this.balanceLocked);
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
      real: this.balanceReal,
      bonus: this.balanceBonus,
      locked: this.balanceLocked,
      total: this.totalBalance,
      withdrawable: this.withdrawableBalance,
      available: this.availableBalance,
    };
  }
}
