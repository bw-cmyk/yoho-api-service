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
import {
  OrderType,
  InstantBuyOrderStatus,
  PaymentStatus,
  PrizeShippingStatus,
} from '../enums/ecommerce.enums';
import { ShippingAddress } from './shipping-address.entity';
import { LogisticsTimeline } from './logistics-timeline.entity';

@Entity('yoho_ecommerce_orders')
@Index(['userId', 'createdAt'])
@Index(['orderNumber'], { unique: true })
@Index(['type', 'paymentStatus'])
export class Order {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true, name: 'order_number' })
  orderNumber: string; // 订单号

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  @Index()
  userId: string; // 用户ID

  @Column({
    type: 'enum',
    enum: OrderType,
  })
  type: OrderType; // INSTANT_BUY or LUCKY_DRAW

  @Column({ type: 'int', name: 'product_id' })
  productId: number; // 商品ID

  @Column({ type: 'json' })
  productInfo: {
    name: string; // 商品名称
    thumbnail: string; // 商品缩略图
    images: string[]; // 商品图片
    specifications: Array<{ key: string; value: string }>; // 商品规格
    originalPrice: string; // 原价
    salePrice: string; // 售价
  }; // 商品信息快照

  @Column({ type: 'int', default: 1 })
  quantity: number; // 购买数量

  // 支付信息
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'payment_amount',
  })
  paymentAmount: Decimal; // 支付金额

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.UNPAID,
    name: 'payment_status',
  })
  paymentStatus: PaymentStatus; // 支付状态

  // Instant Buy 订单状态
  @Column({
    type: 'enum',
    enum: InstantBuyOrderStatus,
    nullable: true,
    name: 'instant_buy_status',
  })
  instantBuyStatus: InstantBuyOrderStatus | null; // Instant Buy订单状态

  // ========== 一元购实物奖品相关字段 ==========

  @Column({
    type: 'enum',
    enum: PrizeShippingStatus,
    nullable: true,
    name: 'prize_shipping_status',
  })
  prizeShippingStatus: PrizeShippingStatus | null; // 一元购奖品发货状态

  @Column({ type: 'int', nullable: true, name: 'draw_result_id' })
  drawResultId: number | null; // 关联中奖记录（当 type = LUCKY_DRAW 时使用）

  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    name: 'logistics_company',
  })
  logisticsCompany: string | null; // 物流公司（一元购实物奖品）

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    name: 'tracking_number',
  })
  trackingNumber: string | null; // 物流单号（一元购实物奖品）

  // ========== 收货地址和物流 ==========

  @Column({ type: 'int', nullable: true, name: 'shipping_address_id' })
  shippingAddressId: number | null; // 收货地址ID

  @Column({ type: 'json', nullable: true, name: 'shipping_address_snapshot' })
  shippingAddressSnapshot: {
    recipientName: string;
    phoneNumber: string;
    country: string;
    state: string;
    city: string;
    streetAddress: string;
    apartment?: string;
    zipCode?: string;
  } | null; // 收货地址快照

  @ManyToOne(() => ShippingAddress, { eager: false, nullable: true })
  @JoinColumn({ name: 'shipping_address_id' })
  shippingAddress: ShippingAddress | null; // 收货地址

  @OneToMany(() => LogisticsTimeline, (timeline) => timeline.order, {
    eager: false,
  })
  logisticsTimelines: LogisticsTimeline[]; // 物流时间线

  @Column({ type: 'timestamp', nullable: true, name: 'refund_requested_at' })
  refundRequestedAt: Date | null; // 退款申请时间

  @Column({ type: 'timestamp', nullable: true, name: 'refunded_at' })
  refundedAt: Date | null; // 退款完成时间

  @Column({ type: 'timestamp', nullable: true, name: 'delivered_at' })
  deliveredAt: Date | null; // 送达时间

  @Column({ type: 'timestamp', nullable: true, name: 'cancelled_at' })
  cancelledAt: Date | null; // 取消时间

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  /**
   * 生成订单号
   */
  static generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD${timestamp}${random}`;
  }

  /**
   * 检查是否可以申请退款（Instant Buy 订单）
   */
  canRequestRefund(): boolean {
    if (this.type !== OrderType.INSTANT_BUY) {
      return false;
    }
    if (this.instantBuyStatus === InstantBuyOrderStatus.REFUNDED) {
      return false;
    }
    if (this.refundRequestedAt) {
      return false;
    }
    // 检查是否超过15天
    const now = new Date();
    const daysSinceOrder =
      (now.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceOrder >= 15;
  }
}
