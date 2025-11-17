import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('yoho_ecommerce_product_specifications')
export class ProductSpecification {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'product_id' })
  productId: number;

  @ManyToOne(() => Product, (product) => product.specifications, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @Column({ type: 'varchar', length: 64 })
  key: string; // 规格键，如 color, size, capacity

  @Column({ type: 'varchar', length: 128 })
  value: string; // 规格值，如 Red, Large, 256GB

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean; // 是否为默认值

  @Column({ type: 'int', default: 0 })
  sort: number; // 排序

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
