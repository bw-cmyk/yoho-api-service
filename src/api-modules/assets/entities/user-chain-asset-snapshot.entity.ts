import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { ChainType } from './user-chain-asset.entity';

export enum SnapshotType {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  MANUAL = 'MANUAL',
}

@Entity('yoho_user_chain_asset_snapshots')
@Index(['userId', 'snapshotType', 'snapshotDate'])
@Index(['snapshotDate', 'snapshotType'])
export class UserChainAssetSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'varchar',
    length: 255,
  })
  userId: string;

  @Column({
    name: 'snapshot_type',
    type: 'enum',
    enum: SnapshotType,
  })
  snapshotType: SnapshotType;

  @Column({
    name: 'snapshot_date',
    type: 'date',
  })
  snapshotDate: Date;

  @Column({
    name: 'token_symbol',
    type: 'varchar',
    length: 20,
  })
  tokenSymbol: string;

  @Column({
    name: 'token_name',
    type: 'varchar',
    length: 100,
  })
  tokenName: string;

  @Column({
    name: 'token_decimals',
    type: 'int',
    default: 18,
  })
  tokenDecimals: number;

  @Column({
    name: 'balance',
    type: 'decimal',
    precision: 36,
    scale: 18,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  balance: Decimal;

  @Column({
    name: 'usd_value',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  usdValue: Decimal;

  @Column({
    name: 'price_usd',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  priceUsd: Decimal;

  @Column({
    name: 'snapshot_metadata',
    type: 'json',
    nullable: true,
  })
  snapshotMetadata?: Record<string, any>;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  /**
   * 获取格式化的余额（考虑小数位数）
   */
  get formattedBalance(): Decimal {
    return this.balance.div(new Decimal(10).pow(this.tokenDecimals));
  }

  /**
   * 获取总价值（USD）
   */
  get totalValueUsd(): Decimal {
    return this.usdValue;
  }

  /**
   * 检查是否有余额
   */
  hasBalance(): boolean {
    return this.balance.gt(0);
  }

  /**
   * 获取快照详情
   */
  getSnapshotDetails() {
    return {
      id: this.id,
      userId: this.userId,
      snapshotType: this.snapshotType,
      snapshotDate: this.snapshotDate,
      tokenSymbol: this.tokenSymbol,
      tokenName: this.tokenName,
      tokenDecimals: this.tokenDecimals,
      balance: this.balance,
      formattedBalance: this.formattedBalance,
      usdValue: this.usdValue,
      priceUsd: this.priceUsd,
      snapshotMetadata: this.snapshotMetadata,
      createdAt: this.createdAt,
    };
  }

  /**
   * 创建快照的静态方法
   */
  static createFromChainAsset(
    chainAsset: any,
    userId: string,
    snapshotType: SnapshotType,
    snapshotDate: Date,
    metadata?: Record<string, any>,
  ): Partial<UserChainAssetSnapshot> {
    return {
      userId,
      snapshotType,
      snapshotDate,
      tokenSymbol: chainAsset.tokenSymbol,
      tokenName: chainAsset.tokenName,
      tokenDecimals: chainAsset.tokenDecimals,
      balance: chainAsset.balance,
      usdValue: chainAsset.usdValue,
      priceUsd: chainAsset.priceUsd,
      snapshotMetadata: metadata,
    };
  }
}
