import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import Decimal from 'decimal.js';

@Entity('yoho_currency_rates')
export class CurrencyRate {
  @PrimaryColumn({ length: 3 })
  currency: string; // 'USD', 'AED', 'INR' - 货币代码

  @Column('decimal', { precision: 18, scale: 8, transformer: {
    to: (value: Decimal) => value?.toString(),
    from: (value: string) => value ? new Decimal(value) : new Decimal(0),
  }})
  rateToUSD: Decimal; // 相对于USD的汇率

  @Column({ length: 10 })
  symbol: string; // '$', 'د.إ', '₹' - 货币符号

  @Column({ length: 100 })
  name: string; // 'US Dollar', 'UAE Dirham', 'Indian Rupee' - 货币名称

  @Column({ type: 'int', default: 2 })
  decimals: number; // 小数位数,默认2位

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // 是否启用

  @Column({ type: 'int', default: 0 })
  displayOrder: number; // 前端展示顺序

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  lastUpdatedAt: Date; // 最后更新时间

  @Column({ nullable: true })
  updatedBy: string; // 更新人(admin userId)

  @CreateDateColumn()
  createdAt: Date; // 创建时间
}
