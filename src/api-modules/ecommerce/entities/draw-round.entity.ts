import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { Product } from './product.entity';
import { DrawParticipation } from './draw-participation.entity';
import { DrawResult } from './draw-result.entity';

export enum DrawRoundStatus {
  ONGOING = 'ONGOING', // 进行中
  COMPLETED = 'COMPLETED', // 已满员，等待开奖
  DRAWN = 'DRAWN', // 已开奖
  CANCELLED = 'CANCELLED', // 已取消
}

@Entity('yoho_ecommerce_draw_rounds')
@Index(['productId', 'roundNumber'], { unique: true })
@Index(['productId', 'status'])
@Index(['status', 'completedAt'])
export class DrawRound {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'product_id' })
  productId: number; // 奖品ID

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product; // 奖品

  @Column({ type: 'int', name: 'round_number' })
  roundNumber: number; // 期次编号，从1开始

  @Column({ type: 'int', name: 'total_spots' })
  totalSpots: number; // 总号码数

  @Column({ type: 'int', default: 0, name: 'sold_spots' })
  soldSpots: number; // 已售号码数

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'price_per_spot',
  })
  pricePerSpot: Decimal; // 每个号码的价格，默认$0.1

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'prize_value',
  })
  prizeValue: Decimal; // 奖品价值（USD）

  @Column({
    type: 'enum',
    enum: DrawRoundStatus,
    default: DrawRoundStatus.ONGOING,
  })
  status: DrawRoundStatus; // 期次状态

  @Column({ type: 'timestamp', nullable: true, name: 'completed_at' })
  completedAt: Date | null; // 满员时间（所有号码售完）

  @Column({ type: 'timestamp', nullable: true, name: 'drawn_at' })
  drawnAt: Date | null; // 开奖时间

  @Column({ type: 'boolean', default: true, name: 'auto_create_next' })
  autoCreateNext: boolean; // 是否自动创建下一期（人工干预可关闭）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  /**
   * 获取剩余号码数
   */
  get remainingSpots(): number {
    return this.totalSpots - this.soldSpots;
  }

  /**
   * 检查是否已满员
   */
  get isFull(): boolean {
    return this.soldSpots >= this.totalSpots;
  }

  /**
   * 获取进度百分比
   */
  get progressPercentage(): number {
    if (this.totalSpots === 0) return 0;
    return Math.round((this.soldSpots / this.totalSpots) * 100);
  }

  /**
   * 检查是否可以购买
   */
  canPurchase(): boolean {
    return (
      this.status === DrawRoundStatus.ONGOING &&
      !this.isFull &&
      this.remainingSpots > 0
    );
  }
}
