import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('yoho_bot_task_logs')
@Index(['taskId', 'createdAt'])
@Index(['botUserId', 'createdAt'])
export class BotTaskLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id' })
  taskId: number;

  @Column({ name: 'task_type' })
  taskType: string;

  @Column({ name: 'bot_user_id' })
  botUserId: string;

  @Column({ default: 'SUCCESS' })
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>; // Execution details

  @Column({ name: 'error_message', nullable: true, type: 'text' })
  errorMessage: string;

  @Column({ name: 'execution_time_ms', nullable: true })
  executionTimeMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
