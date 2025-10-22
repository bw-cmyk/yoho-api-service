import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';

export enum ChainType {
  EVM = 'EVM',
  SOLANA = 'SOLANA',
  BITCOIN = 'BITCOIN',
  // 可以根据需要添加更多链类型
}

@Entity('yoho_user_chain_assets')
@Index(['userId', 'tokenSymbol'], { unique: true })
export class UserChainAsset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'user_id',
    type: 'varchar',
    length: 255,
  })
  userId: string;

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
    name: 'last_updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  lastUpdatedAt: Date;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

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
   * 获取资产详情
   */
  getAssetDetails() {
    return {
      id: this.id,
      userId: this.userId,
      tokenSymbol: this.tokenSymbol,
      tokenName: this.tokenName,
      balance: this.balance,
      usdValue: this.usdValue,
      priceUsd: this.priceUsd,
      lastUpdatedAt: this.lastUpdatedAt,
    };
  }
}
