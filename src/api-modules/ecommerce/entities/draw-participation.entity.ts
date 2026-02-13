import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { DrawRound } from './draw-round.entity';
import { DrawResult } from './draw-result.entity';

@Entity('yoho_ecommerce_draw_participations')
@Index(['drawRoundId', 'startNumber'])
@Index(['userId', 'createdAt'])
@Index(['drawRoundId', 'userId'])
export class DrawParticipation {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'draw_round_id' })
  drawRoundId: number; // 期次ID

  @Column({ type: 'int', name: 'product_id', nullable: true })
  productId: number; // 商品ID

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  userId: string; // 用户ID

  @Column({ type: 'int' })
  quantity: number; // 购买的号码数量

  @Column({ type: 'int', name: 'start_number' })
  startNumber: number; // 起始号码（从1开始）

  @Column({ type: 'int', name: 'end_number' })
  endNumber: number; // 结束号码（包含）

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'total_amount',
  })
  totalAmount: Decimal; // 总支付金额

  @Column({ type: 'varchar', length: 64, name: 'order_number' })
  orderNumber: string; // 关联的订单号

  @Column({ type: 'bigint', name: 'timestamp_sum' })
  timestampSum: number; // 参与时间戳（用于开奖计算）

  @Column({ type: 'boolean', default: false, name: 'is_new_user_chance' })
  isNewUserChance: boolean; // 是否为新用户机会参与

  @Column({ type: 'int', nullable: true, name: 'new_user_chance_id' })
  newUserChanceId: number | null; // 新用户机会ID

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => DrawRound)
  @JoinColumn({ name: 'draw_round_id' })
  drawRound: DrawRound;

  /**
   * 获取购买的号码列表
   */
  get numbers(): number[] {
    const nums: number[] = [];
    for (let i = this.startNumber; i <= this.endNumber; i++) {
      nums.push(i);
    }
    return nums;
  }

  /**
   * 检查是否包含某个号码
   */
  containsNumber(number: number): boolean {
    return number >= this.startNumber && number <= this.endNumber;
  }
}
