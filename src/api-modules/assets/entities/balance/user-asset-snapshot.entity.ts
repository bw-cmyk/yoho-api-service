import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { SnapshotType } from '../onchain/user-chain-asset-snapshot.entity';

export type AssetSnapshotEntryType = 'ONCHAIN' | 'OFFCHAIN';

export interface AssetSnapshotBreakdownItem {
  key: string;
  type: AssetSnapshotEntryType;
  label: string;
  tokenSymbol?: string;
  tokenName?: string;
  currency?: string;
  metadata?: Record<string, any>;
  currentValueUsd: string;
  previousValueUsd: string;
  differenceUsd: string;
}

const decimalTransformer = {
  to: (value: Decimal) => value?.toString() ?? '0',
  from: (value: string | null) => new Decimal(value || '0'),
};

@Entity('yoho_user_asset_snapshots')
@Index(['userId', 'snapshotDate'])
export class UserAssetSnapshot {
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
    default: SnapshotType.MANUAL,
  })
  snapshotType: SnapshotType;

  @Column({
    name: 'snapshot_date',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  snapshotDate: Date;

  @Column({
    name: 'total_assets_usd',
    type: 'decimal',
    precision: 24,
    scale: 8,
    default: 0,
    transformer: decimalTransformer,
  })
  totalAssetsUsd: Decimal;

  @Column({
    name: 'offchain_assets_usd',
    type: 'decimal',
    precision: 24,
    scale: 8,
    default: 0,
    transformer: decimalTransformer,
  })
  offchainAssetsUsd: Decimal;

  @Column({
    name: 'onchain_assets_usd',
    type: 'decimal',
    precision: 24,
    scale: 8,
    default: 0,
    transformer: decimalTransformer,
  })
  onchainAssetsUsd: Decimal;

  @Column({
    name: 'total_change_usd',
    type: 'decimal',
    precision: 24,
    scale: 8,
    default: 0,
    transformer: decimalTransformer,
  })
  totalChangeUsd: Decimal;

  @Column({
    name: 'offchain_change_usd',
    type: 'decimal',
    precision: 24,
    scale: 8,
    default: 0,
    transformer: decimalTransformer,
  })
  offchainChangeUsd: Decimal;

  @Column({
    name: 'onchain_change_usd',
    type: 'decimal',
    precision: 24,
    scale: 8,
    default: 0,
    transformer: decimalTransformer,
  })
  onchainChangeUsd: Decimal;

  @Column({
    name: 'asset_breakdown',
    type: 'json',
    nullable: true,
  })
  assetBreakdown?: AssetSnapshotBreakdownItem[];

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;
}

