import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet, BetStatus } from './entity/Bet.entity';
import { Round } from './entity/Round.entity';
import {
  GameRound,
  BettingResult,
  BetDirection,
  GameResult,
} from './game.types';

@Injectable()
export class GameStorageService {
  private readonly logger = new Logger(GameStorageService.name);

  constructor(
    @InjectRepository(Round)
    private readonly roundRepository: Repository<Round>,
    @InjectRepository(Bet)
    private readonly betRepository: Repository<Bet>,
  ) {}

  /**
   * 保存游戏轮次到数据库
   */
  async saveGameRound(gameRound: GameRound): Promise<Round> {
    try {
      // check if round already exists
      const existingRound = await this.roundRepository.findOne({
        where: { roundId: gameRound.id },
      });

      if (existingRound) {
        // update round
        existingRound.phase = gameRound.phase;
        existingRound.startTime = gameRound.startTime;
        existingRound.bettingEndTime = gameRound.bettingEndTime;
        existingRound.waitingEndTime = gameRound.waitingEndTime;
        existingRound.settleEndTime = gameRound.settleEndTime;
        existingRound.lockedPrice = gameRound.lockedPrice;
        existingRound.closedPrice = gameRound.closedPrice;
        existingRound.result = gameRound.result;
        existingRound.upTotal = gameRound.bettingPool.upTotal;
        existingRound.downTotal = gameRound.bettingPool.downTotal;
        existingRound.totalPool = gameRound.bettingPool.totalPool;
        existingRound.phaseStartTime = gameRound.phaseStartTime;
        existingRound.phaseRemainingTime = gameRound.phaseRemainingTime;
        existingRound.totalPayout = gameRound.totalPayout || 0;
        existingRound.platformFee = gameRound.platformFee || 0;
        existingRound.netProfit = gameRound.netProfit || 0;
        const savedRound = await this.roundRepository.save(existingRound);
        return savedRound;
      } else {
        const round = this.roundRepository.create({
          roundId: gameRound.id,
          phase: gameRound.phase,
          startTime: gameRound.startTime,
          bettingEndTime: gameRound.bettingEndTime,
          waitingEndTime: gameRound.waitingEndTime,
          settleEndTime: gameRound.settleEndTime,
          lockedPrice: gameRound.lockedPrice,
          closedPrice: gameRound.closedPrice,
          result: gameRound.result,
          upTotal: gameRound.bettingPool.upTotal,
          downTotal: gameRound.bettingPool.downTotal,
          totalPool: gameRound.bettingPool.totalPool,
          phaseStartTime: gameRound.phaseStartTime,
          phaseRemainingTime: gameRound.phaseRemainingTime,
          totalPayout: gameRound.totalPayout || 0,
          platformFee: gameRound.platformFee || 0,
          netProfit: gameRound.netProfit || 0,
        });
        const savedRound = await this.roundRepository.save(round);
        return savedRound;
      }
    } catch (error) {
      this.logger.error('❌ 保存游戏轮次失败:', error);
      throw error;
    }
  }

  /**
   * 保存投注到数据库
   */
  async saveBet(
    userId: string,
    direction: BetDirection,
    amount: number,
    gameRoundId: string,
  ): Promise<Bet> {
    try {
      const bet = this.betRepository.create({
        userId,
        direction,
        amount,
        timestamp: Date.now(),
        gameRoundId,
        status: BetStatus.PENDING,
      });

      const savedBet = await this.betRepository.save(bet);
      this.logger.log(
        `✅ 投注已保存到数据库: 用户${userId} - ${direction} ${amount} USDT`,
      );
      return savedBet;
    } catch (error) {
      this.logger.error('❌ 保存投注失败:', error);
      throw error;
    }
  }

  /**
   * 更新投注结果
   */
  async updateBetResults(
    results: BettingResult[],
    gameRoundId: string,
  ): Promise<void> {
    try {
      for (const result of results) {
        const bet = await this.betRepository.findOne({
          where: {
            userId: result.userId,
            gameRoundId,
            direction: result.betDirection,
          },
        });

        if (bet) {
          bet.status = result.isWinner ? BetStatus.WON : BetStatus.LOST;
          bet.payout = result.payout;
          bet.multiplier = result.multiplier;
          await this.betRepository.save(bet);
        }
      }

      this.logger.log(`✅ 已更新 ${results.length} 个投注结果`);
    } catch (error) {
      this.logger.error('❌ 更新投注结果失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户投注历史
   */
  async getUserBetHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ bets: Bet[]; total: number }> {
    try {
      const [bets, total] = await this.betRepository.findAndCount({
        where: { userId },
        order: { createdAt: 'DESC' },
        take: limit,
        skip: offset,
      });

      return { bets, total };
    } catch (error) {
      this.logger.error('❌ 获取用户投注历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取游戏轮次历史
   */
  async getGameRoundHistory(
    limit = 50,
    offset = 0,
  ): Promise<{ rounds: Round[]; total: number }> {
    try {
      const [rounds, total] = await this.roundRepository.findAndCount({
        order: { startTime: 'DESC' },
        take: limit,
        skip: offset,
      });

      return { rounds, total };
    } catch (error) {
      this.logger.error('❌ 获取游戏轮次历史失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定轮次的详细信息
   */
  async getRoundDetails(roundId: string): Promise<Round | null> {
    try {
      const round = await this.roundRepository.findOne({
        where: { roundId },
      });

      return round;
    } catch (error) {
      this.logger.error('❌ 获取轮次详情失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户在当前轮次的投注
   */
  async getUserCurrentBet(
    userId: string,
    gameRoundId: string,
  ): Promise<Bet | null> {
    try {
      const bet = await this.betRepository.findOne({
        where: {
          userId,
          gameRoundId,
        },
      });

      return bet;
    } catch (error) {
      this.logger.error('❌ 获取用户当前投注失败:', error);
      throw error;
    }
  }

  /**
   * 获取投注统计信息
   */
  async getBettingStats(
    userId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalBets: number;
    totalAmount: number;
    wonBets: number;
    lostBets: number;
    totalPayout: number;
    winRate: number;
  }> {
    try {
      const queryBuilder = this.betRepository.createQueryBuilder('bet');

      if (userId) {
        queryBuilder.where('bet.userId = :userId', { userId });
      }

      if (startDate) {
        queryBuilder.andWhere('bet.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('bet.createdAt <= :endDate', { endDate });
      }

      const totalBets = await queryBuilder.getCount();
      const totalAmount = await queryBuilder
        .select('SUM(bet.amount)', 'total')
        .getRawOne()
        .then((result) => parseFloat(result.total) || 0);

      const wonBets = await queryBuilder
        .clone()
        .andWhere('bet.status = :status', { status: BetStatus.WON })
        .getCount();

      const lostBets = await queryBuilder
        .clone()
        .andWhere('bet.status = :status', { status: BetStatus.LOST })
        .getCount();

      const totalPayout = await queryBuilder
        .clone()
        .select('SUM(bet.payout)', 'total')
        .andWhere('bet.status = :status', { status: BetStatus.WON })
        .getRawOne()
        .then((result) => parseFloat(result.total) || 0);

      const winRate = totalBets > 0 ? (wonBets / totalBets) * 100 : 0;

      return {
        totalBets,
        totalAmount,
        wonBets,
        lostBets,
        totalPayout,
        winRate,
      };
    } catch (error) {
      this.logger.error('❌ 获取投注统计失败:', error);
      throw error;
    }
  }

  /**
   * 获取平台费用统计
   */
  async getPlatformFeeStats(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalRounds: number;
    totalPool: number;
    totalPayout: number;
    totalPlatformFee: number;
    totalNetProfit: number;
    averagePoolSize: number;
    averagePayout: number;
    averagePlatformFee: number;
    averageNetProfit: number;
  }> {
    try {
      const queryBuilder = this.roundRepository.createQueryBuilder('round');

      if (startDate) {
        queryBuilder.andWhere('round.createdAt >= :startDate', { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere('round.createdAt <= :endDate', { endDate });
      }

      const stats = await queryBuilder
        .select([
          'COUNT(*) as totalRounds',
          'SUM(round.totalPool) as totalPool',
          'SUM(round.totalPayout) as totalPayout',
          'SUM(round.platformFee) as totalPlatformFee',
          'SUM(round.netProfit) as totalNetProfit',
          'AVG(round.totalPool) as averagePoolSize',
          'AVG(round.totalPayout) as averagePayout',
          'AVG(round.platformFee) as averagePlatformFee',
          'AVG(round.netProfit) as averageNetProfit',
        ])
        .getRawOne();

      return {
        totalRounds: parseInt(stats.totalRounds) || 0,
        totalPool: parseFloat(stats.totalPool) || 0,
        totalPayout: parseFloat(stats.totalPayout) || 0,
        totalPlatformFee: parseFloat(stats.totalPlatformFee) || 0,
        totalNetProfit: parseFloat(stats.totalNetProfit) || 0,
        averagePoolSize: parseFloat(stats.averagePoolSize) || 0,
        averagePayout: parseFloat(stats.averagePayout) || 0,
        averagePlatformFee: parseFloat(stats.averagePlatformFee) || 0,
        averageNetProfit: parseFloat(stats.averageNetProfit) || 0,
      };
    } catch (error) {
      this.logger.error('❌ 获取平台费用统计失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期的游戏数据（可选）
   */
  async cleanupOldData(daysToKeep = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      // 软删除过期的轮次和投注
      await this.roundRepository
        .createQueryBuilder()
        .softDelete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      await this.betRepository
        .createQueryBuilder()
        .softDelete()
        .where('createdAt < :cutoffDate', { cutoffDate })
        .execute();

      this.logger.log(`✅ 已清理 ${daysToKeep} 天前的数据`);
    } catch (error) {
      this.logger.error('❌ 清理过期数据失败:', error);
      throw error;
    }
  }
}
