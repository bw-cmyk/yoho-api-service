import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { LogisticsNodeKey } from '../enums/ecommerce.enums';
import { Order } from './order.entity';

@Entity('yoho_ecommerce_logistics_timelines')
@Index(['orderId', 'nodeKey', 'activatedAt'])
export class LogisticsTimeline {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'order_id' })
  orderId: number;

  @ManyToOne(() => Order, (order) => order.logisticsTimelines, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: LogisticsNodeKey,
    name: 'node_key',
  })
  nodeKey: LogisticsNodeKey; // 物流节点键

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string; // 节点名称

  @Column({ type: 'text', nullable: true })
  description: string; // 节点描述

  @Column({ type: 'int', nullable: true, name: 'day_index' })
  dayIndex: number | null; // 应该在第几天点亮（0表示当天）

  @Column({ type: 'timestamp', nullable: true, name: 'activated_at' })
  activatedAt: Date | null; // 实际激活时间（点亮时间）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * 检查节点是否已激活
   */
  isActivated(): boolean {
    return this.activatedAt !== null;
  }

  /**
   * 激活节点
   */
  activate(): void {
    if (!this.activatedAt) {
      this.activatedAt = new Date();
    }
  }
}
