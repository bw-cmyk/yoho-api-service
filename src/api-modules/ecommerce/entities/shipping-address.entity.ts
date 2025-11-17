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
import { Order } from './order.entity';

@Entity('yoho_ecommerce_shipping_addresses')
@Index(['userId', 'isDefault'])
export class ShippingAddress {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, name: 'user_id' })
  @Index()
  userId: string; // 用户ID

  @Column({ type: 'varchar', length: 128, name: 'recipient_name' })
  recipientName: string; // 收件人姓名

  @Column({ type: 'varchar', length: 32, name: 'phone_number' })
  phoneNumber: string; // 联系电话

  @Column({ type: 'varchar', length: 128 })
  country: string; // 国家

  @Column({ type: 'varchar', length: 128, nullable: true })
  state: string; // 省/州

  @Column({ type: 'varchar', length: 128 })
  city: string; // 城市

  @Column({ type: 'varchar', length: 255, name: 'street_address' })
  streetAddress: string; // 街道地址

  @Column({ type: 'varchar', length: 128, nullable: true, name: 'apartment' })
  apartment: string; // 公寓/套房号

  @Column({ type: 'varchar', length: 32, nullable: true, name: 'zip_code' })
  zipCode: string; // 邮政编码

  @Column({ type: 'boolean', default: false, name: 'is_default' })
  isDefault: boolean; // 是否为默认地址

  @OneToMany(() => Order, (order) => order.shippingAddress)
  orders: Order[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date;

  /**
   * 获取完整地址字符串
   */
  getFullAddress(): string {
    const parts = [
      this.country,
      this.state,
      this.city,
      this.streetAddress,
      this.apartment,
      this.zipCode,
    ].filter((part) => part);
    return parts.join(', ');
  }
}
