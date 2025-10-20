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

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private currentRound: GameRound | null = null;
  private gameHistory: GameRound[] = [];
  private historicalPrices: HistoricalPriceData[] = [];
  private isActive = false;

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
  startNewRound(): GameRound {
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

    this.logger.log(`New round started: ${roundId}`);
    return this.currentRound;
  }

  /**
   * 处理投注
   */
  placeBet(betRequest: BetRequest): {
    success: boolean;
    message: string;
    bet?: Bet;
  } {
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
  settleGame(): { round: GameRound; results: BettingResult[] } {
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

    // 保存到历史记录
    this.gameHistory.push(this.currentRound);

    this.logger.log(`Round ${this.currentRound.id} settled. Result: ${result}`);
    this.logger.log(
      `Pool: UP ${this.currentRound.bettingPool.upTotal}, DOWN ${this.currentRound.bettingPool.downTotal}`,
    );

    return { round: this.currentRound, results };
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
}
