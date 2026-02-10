import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { DrawRound } from './draw-round.entity';
import { PrizeShippingStatus } from '../enums/ecommerce.enums';

export enum PrizeType {
  CASH = 'CASH', // 现金（USDT）
  CRYPTO = 'CRYPTO', // 数字货币
  PHYSICAL = 'PHYSICAL', // 实物奖品
}

export enum PrizeStatus {
  PENDING = 'PENDING', // 待发放
  DISTRIBUTED = 'DISTRIBUTED', // 已发放
  CANCELLED = 'CANCELLED', // 已取消
}

@Entity('yoho_ecommerce_draw_results')
@Index(['drawRoundId'], { unique: true })
@Index(['winningNumber'])
@Index(['winnerUserId'])
export class DrawResult {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'draw_round_id', unique: true })
  drawRoundId: number; // 期次ID

  @ManyToOne(() => DrawRound, { eager: false })
  @JoinColumn({ name: 'draw_round_id' })
  drawRound: DrawRound; // 关联期次

  @Column({ type: 'int', name: 'winning_number' })
  winningNumber: number; // 中奖号码

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'winner_user_id',
  })
  winnerUserId: string | null; // 中奖用户ID

  @Column({ nullable: true, name: 'winner_user_name' })
  winnerUserName: string | null; // 中奖用户名称

  @Column({
    nullable: true,
    name: 'winner_user_avatar',
  })
  winnerUserAvatar: string | null; // 中奖用户头像

  @Column({ type: 'int', nullable: true, name: 'winner_quantity' })
  winnerQuantity: number | null; // 中奖用户购买的号码数量

  @Column({ type: 'int', nullable: true, name: 'winner_participation_id' })
  winnerParticipationId: number | null; // 中奖参与记录ID

  @Column({
    type: 'enum',
    enum: PrizeType,
    name: 'prize_type',
    nullable: true,
    default: PrizeType.PHYSICAL,
  })
  prizeType: PrizeType; // 奖品类型

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'prize_value',
    nullable: true,
    default: '0',
  })
  prizeValue: Decimal; // 奖品价值（USD）

  @Column({
    type: 'enum',
    enum: PrizeStatus,
    default: PrizeStatus.PENDING,
    name: 'prize_status',
  })
  prizeStatus: PrizeStatus; // 奖品发放状态

  // 开奖计算相关字段
  @Column({ type: 'bigint', name: 'timestamp_sum' })
  timestampSum: number; // 所有参与时间戳之和

  @Column({ type: 'int', name: 'block_distance' })
  blockDistance: number; // 区块距离 n = (timestampSum最后2位) + 6

  @Column({ type: 'bigint', name: 'target_block_height' })
  targetBlockHeight: number; // 目标区块高度

  @Column({ type: 'varchar', length: 128, name: 'target_block_hash' })
  targetBlockHash: string; // 目标区块哈希

  @Column({ type: 'varchar', length: 32, name: 'hash_last_6_digits' })
  hashLast6Digits: string; // 区块哈希最后6位数字

  @Column({ type: 'timestamp', name: 'completion_time' })
  completionTime: Date; // 满员完成时间（UTC）

  @Column({ type: 'timestamp', name: 'block_time' })
  blockTime: Date; // 目标区块时间（UTC）

  @Column({ type: 'text', nullable: true, name: 'verification_url' })
  verificationUrl: string | null; // 区块链验证链接

  @Column({ type: 'timestamp', nullable: true, name: 'prize_distributed_at' })
  prizeDistributedAt: Date | null; // 奖品发放时间

  // ========== 实物奖品发货相关字段 ==========

  @Column({ type: 'int', nullable: true, name: 'order_id' })
  orderId: number | null; // 关联订单（领取实物奖品时创建，新方案使用）

  @Column({ type: 'int', nullable: true, name: 'shipping_address_id' })
  shippingAddressId: number | null; // 收货地址ID

  @Column({ type: 'json', nullable: true, name: 'shipping_address_snapshot' })
  shippingAddressSnapshot: {
    recipientName: string;
    phoneNumber: string;
    country: string;
    state: string;
    city: string;
    streetAddress: string;
    apartment?: string;
    zipCode?: string;
  } | null; // 收货地址快照

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'shipping_order_number',
  })
  shippingOrderNumber: string | null; // 发货订单号

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'logistics_company',
  })
  logisticsCompany: string | null; // 物流公司

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    name: 'tracking_number',
  })
  trackingNumber: string | null; // 物流单号

  @Column({ type: 'timestamp', nullable: true, name: 'address_submitted_at' })
  addressSubmittedAt: Date | null; // 地址提交时间

  @Column({ type: 'timestamp', nullable: true, name: 'shipped_at' })
  shippedAt: Date | null; // 发货时间

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date | null; // 签收时间

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
