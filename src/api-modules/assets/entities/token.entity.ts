import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Decimal } from 'decimal.js';

@Entity('yoho_tokens')
@Index(['chainIndex', 'tokenContractAddress'], { unique: true })
@Index(['tokenSymbol', 'chainIndex'])
export class Token {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    name: 'chain_index',
    type: 'varchar',
    length: 10,
  })
  chainIndex: string;

  @Column({
    name: 'token_contract_address',
    type: 'varchar',
    length: 255,
  })
  tokenContractAddress: string;

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
    name: 'decimals',
    type: 'int',
    default: 18,
  })
  decimals: number;

  @Column({
    name: 'token_logo_url',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  tokenLogoUrl?: string;

  @Column({
    name: 'current_price_usd',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  currentPriceUsd: Decimal;

  @Column({
    name: 'price_change_24h',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  priceChange24h: Decimal;

  @Column({
    name: 'price_change_percentage_24h',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  priceChangePercentage24h: Decimal;

  @Column({
    name: 'volume_24h_usd',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  volume24hUsd: Decimal;

  @Column({
    name: 'market_cap_usd',
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  marketCapUsd: Decimal;

  @Column({
    name: 'circ_supply',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  circSupply: string;

  @Column({
    name: 'liquidity',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  liquidity: string;
  @Column({
    name: 'holders',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  holders: string;

  @Column({
    name: 'candle_data',
    type: 'simple-json',
    nullable: true,
  })
  candleData?: any;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive: boolean;

  @Column({
    name: 'last_price_update',
    type: 'timestamp',
    nullable: true,
  })
  lastPriceUpdate?: Date;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;

  /**
   * 获取格式化的当前价格
   */
  get formattedCurrentPrice(): string {
    return this.currentPriceUsd.toFixed(8);
  }

  /**
   * 获取格式化的24小时价格变化
   */
  get formattedPriceChange24h(): string {
    return this.priceChange24h.toFixed(8);
  }

  /**
   * 获取格式化的24小时价格变化百分比
   */
  get formattedPriceChangePercentage24h(): string {
    return this.priceChangePercentage24h.toFixed(2) + '%';
  }

  /**
   * 获取格式化的24小时交易量
   */
  get formattedVolume24h(): string {
    if (this.volume24hUsd.gte(1000000)) {
      return '$' + this.volume24hUsd.div(1000000).toFixed(2) + 'M';
    } else if (this.volume24hUsd.gte(1000)) {
      return '$' + this.volume24hUsd.div(1000).toFixed(2) + 'K';
    }
    return '$' + this.volume24hUsd.toFixed(2);
  }

  /**
   * 获取格式化的市值
   */
  get formattedMarketCap(): string {
    if (this.marketCapUsd.gte(1000000000)) {
      return '$' + this.marketCapUsd.div(1000000000).toFixed(2) + 'B';
    } else if (this.marketCapUsd.gte(1000000)) {
      return '$' + this.marketCapUsd.div(1000000).toFixed(2) + 'M';
    } else if (this.marketCapUsd.gte(1000)) {
      return '$' + this.marketCapUsd.div(1000).toFixed(2) + 'K';
    }
    return '$' + this.marketCapUsd.toFixed(2);
  }

  /**
   * 检查价格是否上涨
   */
  get isPriceUp(): boolean {
    return this.priceChange24h.gt(0);
  }

  /**
   * 检查价格是否下跌
   */
  get isPriceDown(): boolean {
    return this.priceChange24h.lt(0);
  }

  /**
   * 获取价格变化趋势
   */
  get priceTrend(): 'up' | 'down' | 'stable' {
    if (this.priceChangePercentage24h.gt(1)) return 'up';
    if (this.priceChangePercentage24h.lt(-1)) return 'down';
    return 'stable';
  }

  /**
   * 获取token详情
   */
  getTokenDetails() {
    return {
      id: this.id,
      chainIndex: this.chainIndex,
      tokenContractAddress: this.tokenContractAddress,
      tokenSymbol: this.tokenSymbol,
      tokenName: this.tokenName,
      decimals: this.decimals,
      tokenLogoUrl: this.tokenLogoUrl,
      currentPriceUsd: this.currentPriceUsd,
      formattedCurrentPrice: this.formattedCurrentPrice,
      priceChange24h: this.priceChange24h,
      formattedPriceChange24h: this.formattedPriceChange24h,
      priceChangePercentage24h: this.priceChangePercentage24h,
      formattedPriceChangePercentage24h: this.formattedPriceChangePercentage24h,
      volume24hUsd: this.volume24hUsd,
      formattedVolume24h: this.formattedVolume24h,
      marketCapUsd: this.marketCapUsd,
      formattedMarketCap: this.formattedMarketCap,
      isActive: this.isActive,
      lastPriceUpdate: this.lastPriceUpdate,
      priceTrend: this.priceTrend,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
