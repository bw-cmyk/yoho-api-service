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
 * 活动状态
 */
export enum CampaignStatus {
  DRAFT = 'DRAFT', // 草稿
  ACTIVE = 'ACTIVE', // 进行中
  PAUSED = 'PAUSED', // 已暂停
  ENDED = 'ENDED', // 已结束
}

/**
 * 活动实体
 */
@Entity('yoho_campaigns')
@Index(['status', 'startTime'])
@Index(['endTime'])
export class Campaign {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 128 })
  name: string; // 活动名称

  @Column({ type: 'text', nullable: true })
  description: string; // 活动描述

  @Column({ type: 'varchar', length: 64, nullable: true })
  code: string; // 活动代码（唯一标识）

  @Column({
    type: 'enum',
    enum: CampaignStatus,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus; // 活动状态

  @Column({ type: 'timestamp', nullable: true, name: 'start_time' })
  startTime: Date; // 开始时间

  @Column({ type: 'timestamp', nullable: true, name: 'end_time' })
  endTime: Date; // 结束时间（null表示无截止期限）

  @Column({ type: 'json', nullable: true, name: 'participation_conditions' })
  participationConditions: {
    // 参与条件
    userScope?: 'ALL' | 'NEW' | 'EXISTING' | string[]; // 用户范围
    minLevel?: number; // 最小等级
    [key: string]: any;
  };

  @Column({ type: 'json', nullable: true, name: 'reward_config' })
  rewardConfig: {
    // 奖励配置
    totalRewardAmount?: number; // 总奖励金额（如$100）
    currency?: string; // 货币类型
    rewardType?: 'CASH' | 'POINTS' | 'BONUS'; // 奖励类型
    requireClaim?: boolean; // 是否需要手动领取
    claimExpiryDays?: number; // 领取有效期（天数）
    [key: string]: any;
  };

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number; // 排序优先级

  @Column({ type: 'boolean', default: true, name: 'is_visible' })
  isVisible: boolean; // 是否可见

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
