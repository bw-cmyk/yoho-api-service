import { Injectable, Logger } from '@nestjs/common';
import {
  GamePhase,
  BetDirection,
  GameResult,
  Bet,
  GameRound,
  BettingResult,
  GameStatus,
  BetRequest,
  GameConfig,
  HistoricalPriceData,
} from './game.types';
import { GameStorageService } from './game-storage.service';
import { AssetService } from 'src/api-modules/assets/services/asset.service';
import { Currency } from 'src/api-modules/assets/entities/balance/user-asset.entity';
import Decimal from 'decimal.js';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private currentRound: GameRound | null = null;
  private gameHistory: GameRound[] = [];
  private historicalPrices: HistoricalPriceData[] = [];
  private isActive = false;

  constructor(
    private readonly gameStorageService: GameStorageService,
    private readonly assetService: AssetService,
  ) {}

  private readonly config: GameConfig = {
    bettingDuration: 15 * 1000, // 15秒
    waitingDuration: 5 * 1000, // 5秒
    settlingDuration: 3 * 1000, // 3秒
    platformFee: 0.03, // 3%
    minBetAmount: 1, // 1 USDT
    supportedAssets: ['BTC'],
  };

  /**
   * 启动游戏服务
   */
  start(): void {
    this.isActive = true;
    this.logger.log('Game service started');
  }

  /**
   * 停止游戏服务
   */
  stop(): void {
    this.isActive = false;
    this.logger.log('Game service stopped');
  }

  /**
   * 获取游戏状态
   */
  getGameStatus(): GameStatus {
    return {
      currentRound: this.currentRound,
      isActive: this.isActive,
      platformFee: this.config.platformFee,
      minBetAmount: this.config.minBetAmount,
    };
  }

  /**
   * 开始新游戏轮次
   */
  async startNewRound(): Promise<GameRound> {
    const now = Date.now();
    const roundId = `round_${now}`;

    this.currentRound = {
      id: roundId,
      phase: GamePhase.Betting,
      startTime: now,
      bettingEndTime: now + this.config.bettingDuration,
      waitingEndTime:
        now + this.config.bettingDuration + this.config.waitingDuration,
      settleEndTime:
        now +
        this.config.bettingDuration +
        this.config.waitingDuration +
        this.config.settlingDuration,
      lockedPrice: null,
      closedPrice: null,
      result: null,
      bettingPool: {
        upBets: [],
        downBets: [],
        upTotal: 0,
        downTotal: 0,
        totalPool: 0,
      },
      phaseStartTime: now,
      phaseRemainingTime: this.config.bettingDuration,
    };

    await this.gameStorageService.saveGameRound(this.currentRound);

    this.logger.log(`New round started: ${roundId}`);
    return this.currentRound;
  }

  /**
   * 处理投注
   */
  async placeBet(betRequest: BetRequest): Promise<{
    success: boolean;
    message: string;
    bet?: Bet;
  }> {
    if (!this.isActive) {
      return { success: false, message: 'Game is not active' };
    }

    if (!this.currentRound) {
      return { success: false, message: 'No active round' };
    }

    if (this.currentRound.phase !== GamePhase.Betting) {
      return { success: false, message: 'Betting phase is not active' };
    }

    if (betRequest.amount < this.config.minBetAmount) {
      return {
        success: false,
        message: `Minimum bet amount is ${this.config.minBetAmount} USDT`,
      };
    }

    // 检查用户是否已经投注
    const existingBet = this.findUserBet(betRequest.userId);
    if (existingBet) {
      return {
        success: false,
        message: 'User has already placed a bet in this round',
      };
    }

    const bet: Bet = {
      userId: betRequest.userId,
      direction: betRequest.direction,
      amount: betRequest.amount,
      timestamp: Date.now(),
      gameRoundId: this.currentRound.id,
    };

    try {
      await this.assetService.bet({
        userId: bet.userId,
        game_id: 'BTC_PREDICTION',
        currency: Currency.USD,
        amount: new Decimal(bet.amount.toString()),
        metadata: bet,
      });

      // 保存投注到数据库
      await this.gameStorageService.saveBet(
        betRequest.userId,
        betRequest.direction,
        betRequest.amount,
        this.currentRound.id,
      );
    } catch (error) {
      this.logger.error(`Error placing bet: ${error}`);
      return {
        success: false,
        message: 'Failed to place bet: ' + error.message,
      };
    }

    // 添加到相应的投注池
    if (betRequest.direction === BetDirection.UP) {
      this.currentRound.bettingPool.upBets.push(bet);
      this.currentRound.bettingPool.upTotal += betRequest.amount;
    } else {
      this.currentRound.bettingPool.downBets.push(bet);
      this.currentRound.bettingPool.downTotal += betRequest.amount;
    }

    this.currentRound.bettingPool.totalPool =
      this.currentRound.bettingPool.upTotal +
      this.currentRound.bettingPool.downTotal;

    this.logger.log(
      `Bet placed: ${betRequest.userId} - ${betRequest.direction} - ${betRequest.amount} USDT`,
    );

    return { success: true, message: 'Bet placed successfully', bet };
  }

  /**
   * 查找用户的投注
   */
  findUserBet(userId: string): Bet | null {
    if (!this.currentRound) return null;

    const upBet = this.currentRound.bettingPool.upBets.find(
      (bet) => bet.userId === userId,
    );
    const downBet = this.currentRound.bettingPool.downBets.find(
      (bet) => bet.userId === userId,
    );

    return upBet || downBet || null;
  }

  /**
   * 计算赔率
   */
  calculateOdds(): { upOdds: number; downOdds: number } {
    if (!this.currentRound) {
      return { upOdds: 0, downOdds: 0 };
    }

    const pool = this.currentRound.bettingPool;

    const upOdds = pool.upTotal > 0 ? pool.totalPool / pool.upTotal : 0;
    const downOdds = pool.downTotal > 0 ? pool.totalPool / pool.downTotal : 0;

    return { upOdds, downOdds };
  }

  /**
   * 更新游戏阶段
   */
  updateGamePhase(
    newPhase: GamePhase,
    lockedPrice?: string,
    closedPrice?: string,
  ): GameRound | null {
    if (!this.currentRound) return null;

    this.currentRound.phase = newPhase;
    this.currentRound.phaseStartTime = Date.now();

    switch (newPhase) {
      case GamePhase.Waiting:
        this.currentRound.phaseRemainingTime = this.config.waitingDuration;
        this.currentRound.lockedPrice = lockedPrice || null;
        this.logger.log(
          `Round ${this.currentRound.id} entered waiting phase. Locked price: ${lockedPrice}`,
        );
        break;

      case GamePhase.Settling:
        this.currentRound.phaseRemainingTime = this.config.settlingDuration;
        this.currentRound.closedPrice = closedPrice || null;
        this.logger.log(
          `Round ${this.currentRound.id} entered settling phase. Closed price: ${closedPrice}`,
        );
        break;

      case GamePhase.Betting:
        this.currentRound.phaseRemainingTime = this.config.bettingDuration;
        break;
    }

    return this.currentRound;
  }

  /**
   * 结算游戏
   */
  async settleGame(): Promise<{ round: GameRound; results: BettingResult[] }> {
    if (!this.currentRound) {
      throw new Error('No active round to settle');
    }

    if (!this.currentRound.lockedPrice || !this.currentRound.closedPrice) {
      throw new Error('Missing price data for settlement');
    }

    const lockedPrice = parseFloat(this.currentRound.lockedPrice);
    const closedPrice = parseFloat(this.currentRound.closedPrice);

    // 确定游戏结果
    let result: GameResult;
    if (closedPrice > lockedPrice) {
      result = GameResult.UP_WIN;
    } else if (closedPrice < lockedPrice) {
      result = GameResult.DOWN_WIN;
    } else {
      result = GameResult.DRAW;
    }

    this.currentRound.result = result;

    // 计算投注结果
    const results = this.calculateBettingResults(result);

    // 计算费用分配
    const feeCalculation = this.calculateFeeDistribution(results);

    // 更新轮次费用信息
    this.currentRound.totalPayout = feeCalculation.totalPayout;
    this.currentRound.platformFee = feeCalculation.platformFee;
    this.currentRound.netProfit = feeCalculation.netProfit;

    try {
      // update round to database
      await this.gameStorageService.saveGameRound(this.currentRound);

      // 更新投注结果到数据库
      await this.gameStorageService.updateBetResults(
        results,
        this.currentRound.id,
      );

      for (const result of results) {
        if (result.isWinner) {
          await this.assetService.win({
            userId: result.userId,
            currency: Currency.USD,
            amount: new Decimal(result.payout.toString()),
            game_id: 'BTC_PREDICTION',
          });
        }
      }

      this.logger.log(`✅ 游戏轮次已保存到数据库: ${this.currentRound.id}`);
    } catch (error) {
      this.logger.error('❌ 保存游戏数据到数据库失败:', error);
      // 即使数据库保存失败，游戏逻辑仍然继续
    }

    // 保存到历史记录
    this.gameHistory.push(this.currentRound);

    this.logger.log(`Round ${this.currentRound.id} settled. Result: ${result}`);
    this.logger.log(
      `Pool: UP ${this.currentRound.bettingPool.upTotal}, DOWN ${this.currentRound.bettingPool.downTotal}`,
    );

    return { round: this.currentRound, results };
  }

  /**
   * 计算费用分配
   */
  private calculateFeeDistribution(results: BettingResult[]): {
    totalPayout: number;
    platformFee: number;
    netProfit: number;
  } {
    const totalPayout = results.reduce((sum, result) => {
      return sum + (result.isWinner ? result.payout : 0);
    }, 0);

    const totalPool = this.currentRound?.bettingPool.totalPool || 0;
    const platformFee = totalPayout * this.config.platformFee;
    const netProfit = totalPool - totalPayout;

    this.logger.log(
      `费用分配计算: 总池=${totalPool}, 总赔付=${totalPayout}, 平台费=${platformFee}, 净利润=${netProfit}`,
    );

    return {
      totalPayout,
      platformFee,
      netProfit,
    };
  }

  /**
   * 计算投注结果
   */
  private calculateBettingResults(gameResult: GameResult): BettingResult[] {
    if (!this.currentRound) return [];

    const results: BettingResult[] = [];
    const pool = this.currentRound.bettingPool;

    // 计算赔率
    const { upOdds, downOdds } = this.calculateOdds();

    // 处理 UP 投注
    for (const bet of pool.upBets) {
      const isWinner = gameResult === GameResult.UP_WIN;
      const multiplier = isWinner ? upOdds : 0;
      const payout = isWinner
        ? bet.amount * multiplier * (1 - this.config.platformFee)
        : 0;

      // TODO: update record to database
      results.push({
        userId: bet.userId,
        betDirection: BetDirection.UP,
        betAmount: bet.amount,
        isWinner,
        payout,
        multiplier: upOdds,
      });
    }

    // 处理 DOWN 投注
    for (const bet of pool.downBets) {
      // TODO: update record to database
      const isWinner = gameResult === GameResult.DOWN_WIN;
      const multiplier = isWinner ? downOdds : 0;
      const payout = isWinner
        ? bet.amount * multiplier * (1 - this.config.platformFee)
        : 0;

      results.push({
        userId: bet.userId,
        betDirection: BetDirection.DOWN,
        betAmount: bet.amount,
        isWinner,
        payout,
        multiplier: downOdds,
      });
    }

    return results;
  }

  /**
   * 获取游戏历史
   */
  getGameHistory(limit = 10): GameRound[] {
    return this.gameHistory.slice(-limit);
  }

  /**
   * 更新阶段剩余时间
   */
  updatePhaseRemainingTime(): void {
    if (!this.currentRound) return;

    const now = Date.now();
    const phaseElapsed = now - this.currentRound.phaseStartTime;

    switch (this.currentRound.phase) {
      case GamePhase.Betting:
        this.currentRound.phaseRemainingTime = Math.max(
          0,
          this.config.bettingDuration - phaseElapsed,
        );
        break;
      case GamePhase.Waiting:
        this.currentRound.phaseRemainingTime = Math.max(
          0,
          this.config.waitingDuration - phaseElapsed,
        );
        break;
      case GamePhase.Settling:
        this.currentRound.phaseRemainingTime = Math.max(
          0,
          this.config.settlingDuration - phaseElapsed,
        );
        break;
    }
  }

  /**
   * 检查是否应该进入下一阶段
   */
  shouldAdvanceToNextPhase(): {
    shouldAdvance: boolean;
    nextPhase?: GamePhase;
  } {
    if (!this.currentRound) {
      return { shouldAdvance: false };
    }

    this.updatePhaseRemainingTime();

    if (this.currentRound.phaseRemainingTime <= 0) {
      switch (this.currentRound.phase) {
        case GamePhase.Betting:
          return { shouldAdvance: true, nextPhase: GamePhase.Waiting };
        case GamePhase.Waiting:
          return { shouldAdvance: true, nextPhase: GamePhase.Settling };
        case GamePhase.Settling:
          return { shouldAdvance: true };
      }
    }

    return { shouldAdvance: false };
  }

  /**
   * 设置历史价格数据
   */
  setHistoricalPrices(prices: HistoricalPriceData[]): void {
    this.historicalPrices = prices;
    this.logger.log(`Loaded ${prices.length} historical price records`);
  }

  /**
   * 获取历史价格数据
   */
  getHistoricalPrices(): HistoricalPriceData[] {
    return this.historicalPrices;
  }

  /**
   * 获取最近的历史价格数据（用于显示趋势）
   */
  getRecentHistoricalPrices(limit = 100): HistoricalPriceData[] {
    return this.historicalPrices.slice(-limit);
  }

  /**
   * 添加新的历史价格数据
   */
  addHistoricalPrice(priceData: HistoricalPriceData): void {
    this.historicalPrices.push(priceData);

    // 保持最多1000条记录，删除最旧的记录
    if (this.historicalPrices.length > 1000) {
      this.historicalPrices = this.historicalPrices.slice(-1000);
    }
  }

  /**
   * 清空历史价格数据
   */
  clearHistoricalPrices(): void {
    this.historicalPrices = [];
    this.logger.log('Historical prices cleared');
  }

  /**
   * 获取用户投注历史（从数据库）
   */
  async getUserBetHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ bets: any[]; total: number }> {
    return this.gameStorageService.getUserBetHistory(userId, limit, offset);
  }

  /**
   * 获取游戏轮次历史（从数据库）
   */
  async getGameRoundHistory(
    limit = 50,
    offset = 0,
  ): Promise<{ rounds: any[]; total: number }> {
    return this.gameStorageService.getGameRoundHistory(limit, offset);
  }

  /**
   * 获取用户投注统计
   */
  async getUserBettingStats(
    userId: string,
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
    return this.gameStorageService.getBettingStats(userId, startDate, endDate);
  }

  /**
   * 获取用户在当前轮次的投注（从数据库）
   */
  async getUserCurrentBetFromDB(
    userId: string,
    gameRoundId: string,
  ): Promise<any | null> {
    return this.gameStorageService.getUserCurrentBet(userId, gameRoundId);
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
    return this.gameStorageService.getPlatformFeeStats(startDate, endDate);
  }
}
