import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('yoho_bot_tasks')
export class BotTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_type' })
  taskType: string; // 'LUCKY_DRAW', 'BTC_PREDICTION', etc.

  @Column({ name: 'target_id' })
  targetId: string; // productId for lucky draw, gameId for others, etc.

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>; // Type-specific configuration

  @Column({ name: 'last_executed_at', nullable: true, type: 'timestamp' })
  lastExecutedAt: Date;

  @Column({ name: 'next_execute_at', nullable: true, type: 'timestamp' })
  nextExecuteAt: Date;

  @Column({ name: 'executions_today', default: 0 })
  executionsToday: number;

  @Column({ name: 'last_reset_date', nullable: true, type: 'date' })
  lastResetDate: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
