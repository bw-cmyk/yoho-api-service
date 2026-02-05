import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('yoho_bot_lucky_draw_configs')
export class BotLuckyDrawConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', unique: true })
  @Index()
  productId: number;

  @Column({ default: true })
  enabled: boolean;

  // 下单节奏配置
  @Column({ name: 'min_interval_seconds', default: 30 })
  minIntervalSeconds: number;

  @Column({ name: 'max_interval_seconds', default: 300 })
  maxIntervalSeconds: number;

  @Column({ name: 'min_quantity', default: 1 })
  minQuantity: number;

  @Column({ name: 'max_quantity', default: 5 })
  maxQuantity: number;

  @Column({ name: 'daily_order_limit', default: 100 })
  dailyOrderLimit: number;

  @Column({ name: 'max_fill_percentage', default: 80 })
  maxFillPercentage: number;

  // 活跃时段 (0-23)
  @Column({ name: 'active_hours', type: 'jsonb', default: '[]' })
  activeHours: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
