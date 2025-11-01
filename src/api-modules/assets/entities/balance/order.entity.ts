import { ApiProperty } from '@nestjs/swagger';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  DeleteDateColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity({
  name: 'yoho_deposit_withdraw_order',
})
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Index()
  @Column({
    nullable: true,
  })
  uid: string;

  @PrimaryGeneratedColumn({
    name: 'order_id',
  })
  orderId: number;

  @ApiProperty({ example: 1, description: 'Balance' })
  @Column({
    nullable: true,
  })
  amount: string;

  @ApiProperty({ example: 1, description: 'Balance' })
  @Column({
    nullable: true,
  })
  currency: string;

  @Column({
    nullable: true,
    name: 'chain_id',
  })
  @ApiProperty({ example: 1, description: 'ChainId' })
  chainId: number;

  @ApiProperty({ example: '0x......', description: 'wallet Address' })
  @Column({ nullable: true })
  @Index()
  wallet: string;

  @Column({
    default: 0,
  })
  timestamp: number;

  @Column({
    default: 0,
  })
  expireAt: number;

  @Column({
    nullable: true,
  })
  type: string;

  @Column({
    nullable: true,
  })
  channel: string;

  @Column({
    nullable: true,
    name: 'notify_url',
  })
  notifyUrl: string;

  @Column({
    nullable: true,
  })
  processed: boolean;

  @Column({
    nullable: true,
    default: 'pending',
  })
  status: 'pending' | 'approved' | 'cancel' | 'finish';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedDate: Date;
}
