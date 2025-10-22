// TODO: create bet entity
//

import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BetDirection } from '../game.types';
import { Round } from './Round.entity';

export enum BetStatus {
  PENDING = 'PENDING',
  WON = 'WON',
  LOST = 'LOST',
}

/**
 * Bet entity
 * @param id
 * @param userId
 * @param direction
 * @param amount
 * @param timestamp
 * @param gameRoundId
 * @param result
 * @param status
 * @param createdAt
 * @param updatedAt
 */
@Entity('yoho_btc_prediction_bets')
@Index(['userId', 'gameRoundId'])
@Index(['timestamp'])
export class Bet {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64 })
  userId: string;

  @Column({ type: 'enum', enum: BetDirection })
  direction: BetDirection;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  amount: number;

  @Column({ type: 'bigint' })
  timestamp: number;

  @Column({ type: 'varchar', length: 64 })
  gameRoundId: string;

  @Column({ type: 'enum', enum: BetStatus })
  status: BetStatus;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  payout: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, nullable: true })
  multiplier: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
