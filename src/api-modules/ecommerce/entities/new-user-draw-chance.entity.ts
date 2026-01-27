import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { NewUserDrawChanceStatus } from '../enums/ecommerce.enums';

@Entity('yoho_ecommerce_new_user_draw_chances')
@Index(['userId'], { unique: true })
@Index(['status', 'expiresAt'])
export class NewUserDrawChance {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string; // 用户ID（唯一索引）

  @Column({
    type: 'enum',
    enum: NewUserDrawChanceStatus,
    default: NewUserDrawChanceStatus.PENDING,
  })
  status: NewUserDrawChanceStatus; // 状态

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'chance_amount',
    default: '0.1',
  })
  chanceAmount: Decimal; // 0.1 元

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value?.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'bonus_amount',
    default: '0.5',
  })
  bonusAmount: Decimal; // 0.5 元（中奖奖励）

  @Column({ type: 'timestamp', name: 'expires_at' })
  expiresAt: Date; // 过期时间（创建后10分钟）

  @Column({ type: 'timestamp', nullable: true, name: 'claimed_at' })
  claimedAt: Date | null; // 认领时间

  @Column({ type: 'timestamp', nullable: true, name: 'used_at' })
  usedAt: Date | null; // 使用时间

  @Column({ type: 'int', nullable: true, name: 'draw_round_id' })
  drawRoundId: number | null; // 参与的期次ID

  @Column({ type: 'int', nullable: true, name: 'participation_id' })
  participationId: number | null; // 参与记录ID

  @Column({ type: 'boolean', default: false, name: 'is_winner' })
  isWinner: boolean; // 是否中奖

  @Column({ type: 'boolean', default: false, name: 'bonus_granted' })
  bonusGranted: boolean; // bonus是否已发放

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  /**
   * 检查机会是否已过期
   */
  get isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * 获取剩余秒数
   */
  get remainingSeconds(): number {
    const diff = this.expiresAt.getTime() - Date.now();
    return Math.max(0, Math.floor(diff / 1000));
  }

  /**
   * 检查是否可以认领
   */
  canClaim(): boolean {
    return (
      this.status === NewUserDrawChanceStatus.PENDING && !this.isExpired
    );
  }

  /**
   * 检查是否可以使用
   */
  canUse(): boolean {
    return (
      this.status === NewUserDrawChanceStatus.CLAIMED && !this.isExpired
    );
  }
}
