import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FiatOrderStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  EXPIRED = 'expired',
}

@Entity('yoho_fiat_orders')
export class FiatOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @Index()
  orderId: string; // 内部订单号

  @Column()
  @Index()
  uid: string; // 用户ID

  @Column({ length: 20 })
  provider: string; // 支付渠道: 'tkpays' | 'alchemy'

  @Column({ nullable: true })
  providerOrderNo: string; // 第三方订单号

  @Column({ length: 10 })
  fiatCurrency: string; // 法币币种 (THB, VND 等)

  @Column('decimal', { precision: 18, scale: 2 })
  fiatAmount: string; // 法币金额

  @Column('decimal', { precision: 18, scale: 2, nullable: true })
  fiatAmountTrue: string; // 实际支付金额

  @Column({ length: 10, default: 'USD' })
  targetCurrency: string; // 目标币种

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  targetAmount: string; // 转换后金额

  @Column('decimal', { precision: 18, scale: 8, nullable: true })
  exchangeRate: string; // 使用的汇率

  @Column({ length: 50, nullable: true })
  payType: string; // 支付方式

  @Column({
    type: 'varchar',
    length: 20,
    default: FiatOrderStatus.PENDING,
  })
  @Index()
  status: FiatOrderStatus;

  @Column({ nullable: true })
  payUrl: string; // 支付链接

  @Column({ type: 'jsonb', nullable: true })
  callbackData: Record<string, any>; // 回调原始数据

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
