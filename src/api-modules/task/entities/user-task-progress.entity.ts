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
 * 用户任务完成状态
 */
export enum UserTaskStatus {
  PENDING = 'PENDING', // 待完成
  COMPLETED = 'COMPLETED', // 已完成
  REWARD_GRANTED = 'REWARD_GRANTED', // 奖励已发放（仅计数）
}

/**
 * 用户任务进度实体
 */
@Entity('yoho_user_task_progress')
@Index(['userId', 'taskId'])
@Index(['userId', 'campaignId'])
@Index(['taskId'])
export class UserTaskProgress {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string; // 用户ID

  @Column({ type: 'int', name: 'task_id' })
  taskId: number; // 任务ID

  @Column({ type: 'int', name: 'campaign_id' })
  campaignId: number; // 活动ID（冗余字段，便于查询）

  @Column({
    type: 'enum',
    enum: UserTaskStatus,
    default: UserTaskStatus.PENDING,
  })
  status: UserTaskStatus; // 完成状态

  @Column({ type: 'int', default: 0, name: 'completion_count' })
  completionCount: number; // 完成次数（用于重复任务）

  @Column({ type: 'timestamp', nullable: true, name: 'first_completed_at' })
  firstCompletedAt: Date; // 首次完成时间

  @Column({ type: 'timestamp', nullable: true, name: 'last_completed_at' })
  lastCompletedAt: Date; // 最后完成时间

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    name: 'accumulated_reward_amount',
  })
  accumulatedRewardAmount: number; // 累计奖励金额（仅计数，不实际发放）

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // 额外数据（如完成时的具体数据）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
