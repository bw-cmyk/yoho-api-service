import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Decimal } from 'decimal.js';
import { Product } from './product.entity';

@Entity('yoho_ecommerce_product_reviews')
@Index(['productId', 'createdAt'])
export class ProductReview {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'product_id' })
  productId: number;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: true,
    name: 'reviewer_name',
  })
  reviewerName: string; // 评价人昵称

  @Column({
    type: 'varchar',
    length: 512,
    nullable: true,
    name: 'reviewer_avatar',
  })
  reviewerAvatar: string; // 评价人头像

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: {
      to: (value: Decimal) => value.toString(),
      from: (value: string) => new Decimal(value || '0'),
    },
  })
  rating: Decimal; // 评分，5星评分体系

  @Column({ type: 'text', nullable: true })
  content: string; // 评价文案，100字以内

  @Column({ type: 'json', nullable: true, default: [] })
  tags: string[]; // 评价标签，评价文案中的关键词

  @Column({ type: 'timestamp', name: 'review_time', nullable: true })
  reviewTime: Date; // 评价时间

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
