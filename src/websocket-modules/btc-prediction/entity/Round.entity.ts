import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GamePhase, GameResult } from '../game.types';
import { Bet } from './Bet.entity';

/**
 * Game Round entity
 */
@Entity('yoho_btc_prediction_rounds')
@Index(['roundId'])
@Index(['startTime'])
@Index(['result'])
export class Round {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 64, unique: true })
  roundId: string;

  @Column({ type: 'enum', enum: GamePhase })
  phase: GamePhase;

  @Column({ type: 'bigint' })
  startTime: number;

  @Column({ type: 'bigint' })
  bettingEndTime: number;

  @Column({ type: 'bigint' })
  waitingEndTime: number;

  @Column({ type: 'bigint' })
  settleEndTime: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  lockedPrice: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  closedPrice: string;

  @Column({ type: 'enum', enum: GameResult, nullable: true })
  result: GameResult;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  upTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  downTotal: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalPool: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  totalPayout: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  platformFee: number;

  @Column({ type: 'decimal', precision: 18, scale: 8, default: 0 })
  netProfit: number;

  @Column({ type: 'bigint', nullable: true })
  phaseStartTime: number;

  @Column({ type: 'bigint', nullable: true })
  phaseRemainingTime: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
