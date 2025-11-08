import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * 任务完成记录实体
 * 用于记录每次任务完成，支持重复任务
 */
@Entity('yoho_task_completions')
@Index(['userId', 'taskId', 'completedAt'])
@Index(['userId', 'campaignId'])
export class TaskCompletion {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string; // 用户ID

  @Column({ type: 'int', name: 'task_id' })
  taskId: number; // 任务ID

  @Column({ type: 'int', name: 'campaign_id' })
  campaignId: number; // 活动ID（冗余字段）

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 8,
    default: 0,
    name: 'reward_amount',
  })
  rewardAmount: number; // 本次完成获得的奖励金额（仅计数）

  @Column({ type: 'json', nullable: true, name: 'completion_data' })
  completionData: Record<string, any>; // 完成时的数据（如交易金额、游戏类型等）

  @Column({ type: 'varchar', length: 64, nullable: true, name: 'reference_id' })
  referenceId: string; // 关联的业务ID（如交易ID、游戏ID等）

  @Column({ type: 'timestamp', name: 'completed_at' })
  completedAt: Date; // 完成时间

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
