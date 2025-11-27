import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { ProductType, ProductStatus } from '../enums/ecommerce.enums';
import { ProductSpecification } from './product-specification.entity';
import { ProductReview } from './product-review.entity';

@Entity('yoho_ecommerce_products')
@Index(['type', 'status', 'priority'])
@Index(['status', 'saleStartTime', 'saleEndTime'])
export class Product {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({
    type: 'enum',
    enum: ProductType,
  })
  type: ProductType; // INSTANT_BUY or LUCKY_DRAW

  @Column({ type: 'int', default: 0 })
  priority: number; // 优先级，用于显示规则和列表排序

  @Column({ type: 'varchar', length: 64, nullable: true })
  badge: string; // 运营角标，2个单词内的文案

  @Column({ type: 'varchar', length: 255 })
  name: string; // 商品名称

  @Column({ type: 'text', nullable: true })
  description: string; // 商品描述，一句话运营文案

  @Column({ type: 'varchar', length: 512, nullable: true })
  thumbnail: string; // 商品缩略图，用于列表展示

  @Column({ type: 'json', nullable: true, default: [] })
  images: string[]; // 商品图片，支持多张大图，用于详情页展示

  @Column({ type: 'text', nullable: true })
  detail: string; // 商品详情，富文本

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'original_price',
  })
  originalPrice: Decimal; // 原价

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'sale_price',
  })
  salePrice: Decimal; // 售价，用户购买实际需支付价格

  @Column({ type: 'int', default: 0, name: 'stock' })
  stock: number; // 库存，配置总库存即可

  @Column({ type: 'int', nullable: true, name: 'daily_sales_range' })
  dailySalesRange: number; // 日销量范围值，如1000个，用于模拟数据

  @Column({ type: 'json', nullable: true, default: [] })
  tags: Array<{ icon?: string; text: string }>; // 标签，支持多个，icon+文案组合，如包邮、运费险等

  @Column({ type: 'timestamp', nullable: true, name: 'sale_start_time' })
  saleStartTime: Date; // 售卖开始时间

  @Column({ type: 'timestamp', nullable: true, name: 'sale_end_time' })
  saleEndTime: Date; // 售卖结束时间

  @Column({ type: 'int', nullable: true, name: 'purchase_limit' })
  purchaseLimit: number; // 单用户购买数量上限，null视为库存范围内无上限

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
    name: 'total_rating',
  })
  totalRating: Decimal; // 累计评分

  @Column({ type: 'int', default: 0, name: 'review_count' })
  reviewCount: number; // 评价数

  @Column({ type: 'int', nullable: true, name: 'delivery_days_min' })
  deliveryDaysMin: number; // 到货时间最小值（天数）

  @Column({ type: 'int', nullable: true, name: 'delivery_days_max' })
  deliveryDaysMax: number; // 到货时间最大值（天数）

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus; // 商品状态

  specifications: ProductSpecification[]; // 商品规格

  reviews: ProductReview[]; // 商品评价

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  /**
   * 计算平均评分
   */
  get averageRating(): Decimal {
    if (this.reviewCount === 0) {
      return new Decimal(0);
    }
    return this.totalRating.dividedBy(this.reviewCount);
  }

  /**
   * 计算折扣百分比
   */
  get discountPercentage(): number {
    if (this.originalPrice.isZero()) {
      return 0;
    }
    const discount = this.originalPrice
      .minus(this.salePrice)
      .dividedBy(this.originalPrice)
      .times(100);
    return Math.round(discount.toNumber());
  }

  /**
   * 检查是否可售卖
   */
  isAvailableForSale(): boolean {
    const now = new Date();
    // 状态必须是ACTIVE
    if (this.status !== ProductStatus.ACTIVE) {
      return false;
    }
    // 必须有库存
    if (this.stock <= 0) {
      return false;
    }
    // 必须在售卖时间范围内
    if (this.saleStartTime && now < this.saleStartTime) {
      return false;
    }
    if (this.saleEndTime && now > this.saleEndTime) {
      return false;
    }
    return true;
  }
}
