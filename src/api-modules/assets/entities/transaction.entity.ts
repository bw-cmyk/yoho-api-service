import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { Currency } from './user-asset.entity';

export enum TransactionType {
  DEPOSIT = 'DEPOSIT', // 充值
  BONUS_GRANT = 'BONUS_GRANT', // 赠金发放
  GAME_BET = 'GAME_BET', // 游戏下注
  GAME_WIN = 'GAME_WIN', // 游戏中奖
  GAME_REFUND = 'GAME_REFUND', // 游戏退款
  WITHDRAW = 'WITHDRAW', // 提现
  TRANSFER = 'TRANSFER', // 转账
  LOCK = 'LOCK', // 锁定
  UNLOCK = 'UNLOCK', // 解锁
  ADJUSTMENT = 'ADJUSTMENT', // 余额调整
}

export enum TransactionSource {
  REAL = 'REAL', // 真实余额
  BONUS = 'BONUS', // 赠金余额
  LOCKED = 'LOCKED', // 锁定余额
}

export enum TransactionStatus {
  PENDING = 'PENDING', // 处理中
  SUCCESS = 'SUCCESS', // 成功
  FAILED = 'FAILED', // 失败
  CANCELLED = 'CANCELLED', // 已取消
}

@Entity('yoho_transactions')
@Index(['user_id', 'created_at'])
@Index(['transaction_id'], { unique: true })
@Index(['type', 'status'])
export class Transaction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  transaction_id: string;

  @Column({ type: 'bigint' })
  user_id: number;

  @Column({ type: 'varchar', length: 10 })
  currency: Currency;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TransactionSource,
    nullable: true,
  })
  source: TransactionSource;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  amount: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => (value ? new Decimal(value) : null),
    },
  })
  balance_before: Decimal;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    nullable: true,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => (value ? new Decimal(value) : null),
    },
  })
  balance_after: Decimal;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reference_id: string; // 关联的业务ID（如游戏ID、订单ID等）

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string; // 交易描述

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // 额外的元数据

  @Column({ type: 'varchar', length: 255, nullable: true })
  operator_id: string; // 操作员ID（系统操作或人工操作）

  @CreateDateColumn()
  created_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  processed_at: Date; // 处理完成时间

  /**
   * 生成交易ID
   */
  static generateTransactionId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN${timestamp}${random}`.toUpperCase();
  }

  /**
   * 获取交易金额（正数表示收入，负数表示支出）
   */
  getSignedAmount(): Decimal {
    const outflowTypes = [
      TransactionType.GAME_BET,
      TransactionType.WITHDRAW,
      TransactionType.LOCK,
      TransactionType.TRANSFER,
    ];

    if (outflowTypes.includes(this.type)) {
      return this.amount.negated();
    }

    return this.amount;
  }

  /**
   * 检查是否为收入交易
   */
  isIncome(): boolean {
    return this.getSignedAmount().isPositive();
  }

  /**
   * 检查是否为支出交易
   */
  isExpense(): boolean {
    return this.getSignedAmount().isNegative();
  }

  /**
   * 获取交易摘要
   */
  getSummary() {
    return {
      id: this.transaction_id,
      type: this.type,
      amount: this.amount,
      signedAmount: this.getSignedAmount(),
      currency: this.currency,
      status: this.status,
      createdAt: this.created_at,
      description: this.description,
    };
  }
}
