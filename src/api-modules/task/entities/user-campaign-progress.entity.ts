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
 * 用户活动参与状态
 */
export enum UserCampaignStatus {
  PARTICIPATED = 'PARTICIPATED', // 已参与
  COMPLETED = 'COMPLETED', // 已完成（达到领取条件）
  REWARD_CLAIMED = 'REWARD_CLAIMED', // 已领取奖励
  EXPIRED = 'EXPIRED', // 已过期
}

/**
 * 用户活动进度实体
 */
@Entity('yoho_user_campaign_progress')
@Index(['userId', 'campaignId'], { unique: true })
@Index(['userId', 'status'])
@Index(['campaignId'])
export class UserCampaignProgress {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string; // 用户ID

  @Column({ type: 'int', name: 'campaign_id' })
  campaignId: number; // 活动ID

  @Column({
    type: 'enum',
    enum: UserCampaignStatus,
    default: UserCampaignStatus.PARTICIPATED,
  })
  status: UserCampaignStatus; // 参与状态

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    name: 'accumulated_reward',
  })
  accumulatedReward: number; // 累计奖励金额

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date; // 完成时间（达到领取条件的时间）

  @Column({ type: 'timestamp', nullable: true, name: 'claimed_at' })
  claimedAt: Date; // 领取时间

  @Column({ type: 'timestamp', nullable: true, name: 'claim_expiry_at' })
  claimExpiryAt: Date; // 领取过期时间

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // 额外数据

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
