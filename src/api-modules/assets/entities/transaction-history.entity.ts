import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';

export enum TransactionItype {
  OUTER_MAIN_CHAIN = '0', // 外层主链币转移
  INNER_MAIN_CHAIN = '1', // 合约内层主链币转移
  TOKEN_TRANSFER = '2', // token转移
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAIL = 'fail',
  PENDING = 'pending',
}

@Entity('yoho_transaction_history')
@Index(['address', 'chainIndex', 'txTime'])
@Index(['txHash'], { unique: true })
@Index(['tokenContractAddress', 'txTime'])
export class TransactionHistory {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 42 })
  address: string; // 用户地址

  @Column({ type: 'varchar', length: 10 })
  chainIndex: string; // 链ID

  @Column({ type: 'varchar', length: 66, unique: true })
  txHash: string; // 交易hash

  @Column({
    type: 'enum',
    enum: TransactionItype,
  })
  itype: TransactionItype; // 交易的层级类型

  @Column({ type: 'varchar', length: 10, nullable: true })
  methodId: string; // 合约调用函数

  @Column({ type: 'varchar', length: 20, nullable: true })
  nonce: string; // 发起者地址发起的第几笔交易

  @Column({ type: 'bigint' })
  txTime: number; // 交易时间，Unix时间戳的毫秒数格式

  @Column({ type: 'json' })
  from: Array<{
    address: string;
    amount: string;
  }>; // 交易输入

  @Column({ type: 'json' })
  to: Array<{
    address: string;
    amount: string;
  }>; // 交易输出

  @Column({ type: 'varchar', length: 42, nullable: true })
  tokenContractAddress: string; // 代币的合约地址

  @Column({
    type: 'decimal',
    precision: 36,
    scale: 18,
    nullable: true,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => (value ? new Decimal(value) : null),
    },
  })
  amount: Decimal; // 交易数量

  @Column({ type: 'varchar', length: 20, nullable: true })
  symbol: string; // 交易数量对应的币种

  @Column({
    type: 'decimal',
    precision: 36,
    scale: 18,
    nullable: true,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => (value ? new Decimal(value) : null),
    },
  })
  txFee: Decimal; // 手续费

  @Column({
    type: 'enum',
    enum: TransactionStatus,
  })
  txStatus: TransactionStatus; // 交易状态

  @Column({ type: 'boolean', default: false })
  hitBlacklist: boolean; // 是否在黑名单中

  // PnL 计算相关字段
  @Column({
    type: 'decimal',
    precision: 36,
    scale: 18,
    nullable: true,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => (value ? new Decimal(value) : null),
    },
  })
  costBasis: Decimal; // 成本基础（买入价格）

  @Column({
    type: 'decimal',
    precision: 36,
    scale: 18,
    nullable: true,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => (value ? new Decimal(value) : null),
    },
  })
  realizedPnl: Decimal; // 已实现盈亏

  @Column({
    type: 'decimal',
    precision: 36,
    scale: 18,
    nullable: true,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => (value ? new Decimal(value) : null),
    },
  })
  unrealizedPnl: Decimal; // 未实现盈亏

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // 额外的元数据

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 计算已实现盈亏
   */
  calculateRealizedPnl(sellPrice: Decimal): Decimal {
    if (!this.costBasis || !this.amount) {
      return new Decimal(0);
    }

    const sellValue = sellPrice.mul(this.amount);
    const costValue = this.costBasis.mul(this.amount);
    
    return sellValue.minus(costValue);
  }

  /**
   * 计算未实现盈亏
   */
  calculateUnrealizedPnl(currentPrice: Decimal): Decimal {
    if (!this.costBasis || !this.amount) {
      return new Decimal(0);
    }

    const currentValue = currentPrice.mul(this.amount);
    const costValue = this.costBasis.mul(this.amount);
    
    return currentValue.minus(costValue);
  }

  /**
   * 获取交易摘要
   */
  getSummary() {
    return {
      id: this.id,
      txHash: this.txHash,
      chainIndex: this.chainIndex,
      tokenContractAddress: this.tokenContractAddress,
      symbol: this.symbol,
      amount: this.amount,
      txTime: this.txTime,
      txStatus: this.txStatus,
      realizedPnl: this.realizedPnl,
      unrealizedPnl: this.unrealizedPnl,
      costBasis: this.costBasis,
    };
  }
}
