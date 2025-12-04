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

  @Column({ type: 'int', name: 'winning_number' })
  winningNumber: number; // 中奖号码

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'winner_user_id',
  })
  winnerUserId: string | null; // 中奖用户ID

  @Column({ type: 'int', nullable: true, name: 'winner_participation_id' })
  winnerParticipationId: number | null; // 中奖参与记录ID

  @Column({
    type: 'enum',
    enum: PrizeType,
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
  })
  prizeValue: Decimal; // 奖品价值（USD）

  @Column({
    type: 'enum',
    enum: PrizeStatus,
    default: PrizeStatus.PENDING,
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
