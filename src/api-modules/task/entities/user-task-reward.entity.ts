import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { RewardType } from './task-reward.entity';

/**
 * 用户任务奖励状态
 */
export enum UserTaskRewardStatus {
  ACTIVE = 'ACTIVE', // 有效
  FROZEN = 'FROZEN', // 冻结
  EXPIRED = 'EXPIRED', // 已过期
}

/**
 * 用户任务奖励实体
 * 每个用户每种奖励类型只有一条记录，用于记录用户的任务奖励金
 * 唯一性约束：userId + rewardType
 */
@Entity('yoho_campaign_user_task_rewards')
@Unique(['userId', 'taskId'])
@Index(['userId', 'taskId'])
@Index(['userId'])
export class UserTaskReward {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string; // 用户ID

  @Column({ type: 'int', name: 'task_id' })
  taskId: number; // 任务ID

  @Column({
    type: 'enum',
    enum: RewardType,
    name: 'reward_type',
  })
  rewardType: RewardType; // 奖励类型（CASH, POINTS, BONUS, CUSTOM）

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    name: 'total_reward',
  })
  totalReward: number; // 总任务奖励金额（累计获得的所有任务奖励）

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    name: 'available_reward',
  })
  availableReward: number; // 可用奖励金额（可领取的金额）

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    name: 'claimed_reward',
  })
  claimedReward: number; // 已领取奖励金额

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    name: 'frozen_reward',
  })
  frozenReward: number; // 冻结奖励金额

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string; // 货币类型（USD, USDT等）

  @Column({
    type: 'enum',
    enum: UserTaskRewardStatus,
    default: UserTaskRewardStatus.ACTIVE,
  })
  status: UserTaskRewardStatus; // 状态

  @Column({ type: 'timestamp', nullable: true, name: 'last_reward_at' })
  lastRewardAt: Date; // 最后获得奖励的时间

  @Column({ type: 'timestamp', nullable: true, name: 'last_claim_at' })
  lastClaimAt: Date; // 最后领取奖励的时间

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // 额外数据

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
