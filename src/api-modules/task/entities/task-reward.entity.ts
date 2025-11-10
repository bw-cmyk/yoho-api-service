import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * 奖励类型
 */
export enum RewardType {
  CASH = 'CASH', // 现金
  POINTS = 'POINTS', // 积分
  BONUS = 'BONUS', // 赠金
  CUSTOM = 'CUSTOM', // 自定义
}

/**
 * 奖励发放类型
 */
export enum RewardGrantType {
  FIXED = 'FIXED', // 固定金额
  RANDOM = 'RANDOM', // 随机金额
  PROGRESSIVE = 'PROGRESSIVE', // 渐进式（如签到奖励）
}

/**
 * 任务奖励实体
 */
@Entity('yoho_campaign_task_rewards')
@Index(['taskId'])
export class TaskReward {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'task_id' })
  taskId: number;

  @Column({
    type: 'enum',
    enum: RewardType,
    name: 'reward_type',
  })
  rewardType: RewardType; // 奖励类型

  @Column({
    type: 'enum',
    enum: RewardGrantType,
    default: RewardGrantType.FIXED,
    name: 'grant_type',
  })
  grantType: RewardGrantType; // 发放类型

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  amount: number; // 固定金额（grantType为FIXED时使用）

  @Column({ type: 'json', nullable: true, name: 'amount_config' })
  amountConfig: {
    // 金额配置（用于随机或渐进式奖励）
    min?: number; // 最小金额
    max?: number; // 最大金额
    progressiveRules?: {
      // 渐进式规则（如签到奖励）
      threshold?: number; // 已领阈值
      minAmount?: number; // 该阈值下的最小金额
      maxAmount?: number; // 该阈值下的最大金额
      meanHalf?: boolean; // 均值减半
    }[];
    [key: string]: any;
  };

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string; // 货币类型（USD, USDT等）

  @Column({
    type: 'varchar',
    length: 32,
    default: 'GAME_BALANCE',
    name: 'target_balance',
  })
  targetBalance: string; // 目标余额类型（GAME_BALANCE, CASH_BALANCE等）

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // 额外配置

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
