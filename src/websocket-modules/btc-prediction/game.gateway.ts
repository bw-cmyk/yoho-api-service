import { Injectable, Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UserService } from 'src/api-modules/user/service/user.service';
import {
  BinanceIndexService,
  BinanceIndexPriceData,
} from './binance-index.service';
import { GameService } from './game.service';
import { GamePhase, BetDirection, BetRequest } from './game.types';
import { WsGuard } from 'src/common-modules/auth/ws.guard';

@WebSocketGateway({
  path: '/ws',
  cors: {
    origin: '*',
  },
})
@Injectable()
export class EventsGateway {
  protected readonly logger = new Logger(EventsGateway.name);
  private currentBtcPrice: string | null = null;
  private currentBtcPriceTimestamp: number | null = null;
  private gameLoopInterval: NodeJS.Timeout | null = null;
  @WebSocketServer()
  server: Server;

  constructor(
    protected readonly jwtService: JwtService,
    protected readonly userService: UserService,
    private readonly binanceIndexService: BinanceIndexService,
    private readonly gameService: GameService,
  ) {
    this.setup();
  }

  afterInit() {
    this.logger.log('socket Initialized');
  }

  handleConnection() {
    this.logger.debug(
      `Number of connected clients: ${this.server.engine.clientsCount}`,
    );
  }

  async setup() {
    try {
      this.logger.log('🚀 开始初始化游戏服务...');

      // 启动游戏服务
      this.gameService.start();
      this.logger.log('✅ 游戏服务已启动');

      // 启动币安指数价格服务
      await this.binanceIndexService.start();
      this.logger.log('✅ 币安指数价格服务已启动');

      // 异步加载历史价格数据（不阻塞游戏启动）
      this.loadHistoricalPricesAsync();

      // 注册价格回调
      this.binanceIndexService.addPriceCallback(
        (data: BinanceIndexPriceData) => {
          this.handleBtcPriceUpdate(data);
        },
      );

      // 启动游戏循环
      this.startGameLoop();
      this.logger.log('✅ 游戏循环已启动');

      // 开始第一轮游戏
      await this.startNewGameRound();
      this.logger.log('✅ 游戏初始化完成');
    } catch (error) {
      this.logger.error('❌ 游戏服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 启动游戏循环
   */
  private startGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
    }

    this.gameLoopInterval = setInterval(() => {
      this.gameLoop();
    }, 1000); // 每100ms检查一次
  }

  /**
   * 游戏主循环
   */
  private gameLoop(): void {
    try {
      const gameStatus = this.gameService.getGameStatus();

      if (!gameStatus.currentRound) {
        return;
      }

      // 检查是否需要进入下一阶段
      const { shouldAdvance, nextPhase } =
        this.gameService.shouldAdvanceToNextPhase();

      if (shouldAdvance && nextPhase) {
        this.advanceToNextPhase(nextPhase);
      }

      // 广播当前游戏状态
      this.broadcastGameStatus();
    } catch (error) {
      this.logger.error('Game Loop Error:', error);
    }
  }

  /**
   * 开始新的游戏轮次
   */
  private async startNewGameRound(): Promise<void> {
    const newRound = await this.gameService.startNewRound();
    this.logger.log(`Started new game round: ${newRound.id}`);
    this.broadcastGameStatus();
  }

  /**
   * 进入下一阶段
   */
  private advanceToNextPhase(nextPhase: GamePhase): void {
    const gameStatus = this.gameService.getGameStatus();
    if (!gameStatus.currentRound) return;

    switch (nextPhase) {
      case GamePhase.Waiting:
        // 记录锁定价格
        this.gameService.updateGamePhase(
          GamePhase.Waiting,
          this.currentBtcPrice || '0',
          undefined,
          this.currentBtcPriceTimestamp || 0,
        );
        this.logger.log(
          `Entered waiting phase. Locked price: ${this.currentBtcPrice}`,
        );
        break;

      case GamePhase.Settling:
        // 记录收盘价格
        this.gameService.updateGamePhase(
          GamePhase.Settling,
          undefined,
          this.currentBtcPrice || '0',
          this.currentBtcPriceTimestamp || 0,
        );
        this.logger.log(
          `Entered settling phase. Closed price: ${this.currentBtcPrice}`,
        );
        this.settleGame();
        break;
    }

    this.broadcastGameStatus();
  }

  /**
   * 结算游戏
   */
  private async settleGame(): Promise<void> {
    try {
      const { round, results } = await this.gameService.settleGame();

      // 广播结算结果
      this.server?.emit('gameSettled', {
        roundId: round.id,
        result: round.result,
        lockedPrice: round.lockedPrice,
        closedPrice: round.closedPrice,
        closedPriceTimestamp: round.closedPriceTimestamp,
        results: results,
      });

      this.logger.log(`Game settled: ${round.result}`);

      await this.startNewGameRound();
    } catch (error) {
      this.logger.error('Error settling game:', error);
    }
  }

  /**
   * 广播游戏状态
   */
  private broadcastGameStatus(): void {
    const gameStatus = this.gameService.getGameStatus();
    if (!gameStatus.currentRound) return;

    // 更新剩余时间
    this.gameService.updatePhaseRemainingTime();

    // 计算赔率
    const { upOdds, downOdds } = this.gameService.calculateOdds();

    this.server?.emit('gameStatus', {
      roundId: gameStatus.currentRound.id,
      phase: gameStatus.currentRound.phase,
      phaseRemainingTime: gameStatus.currentRound.phaseRemainingTime,
      lockedPrice: gameStatus.currentRound.lockedPrice,
      lockedPriceTimestamp: gameStatus.currentRound.lockedPriceTimestamp,
      closedPrice: gameStatus.currentRound.closedPrice,
      closedPriceTimestamp: gameStatus.currentRound.closedPriceTimestamp,
      currentPrice: this.currentBtcPrice,
      bettingPool: {
        upTotal: gameStatus.currentRound.bettingPool.upTotal,
        downTotal: gameStatus.currentRound.bettingPool.downTotal,
        totalPool: gameStatus.currentRound.bettingPool.totalPool,
        upBets: gameStatus.currentRound.bettingPool.upBets,
        downBets: gameStatus.currentRound.bettingPool.downBets,
      },
      odds: {
        up: upOdds,
        down: downOdds,
      },
      platformFee: gameStatus.platformFee,
      minBetAmount: gameStatus.minBetAmount,
      result: gameStatus.currentRound.result,
    });
  }

  /**
   * 广播历史价格数据
   */
  private broadcastHistoricalPrices(): void {
    const historicalPrices = this.gameService.getRecentHistoricalPrices(100);

    this.server?.emit('historicalPrices', {
      prices: historicalPrices,
      count: historicalPrices.length,
    });

    this.logger.log(
      `Broadcasted ${historicalPrices.length} historical price records`,
    );
  }

  /**
   * 处理 BTC 价格更新
   */
  private handleBtcPriceUpdate(data: BinanceIndexPriceData): void {
    this.currentBtcPrice = data.price;
    this.currentBtcPriceTimestamp = data.timestamp;
    // 广播价格更新给所有连接的客户端
    this.server?.emit('btcPriceUpdate', {
      symbol: data.symbol,
      price: data.price,
      timestamp: data.timestamp,
    });
  }

  /**
   * 获取当前 BTC 价格
   */
  getCurrentBtcPrice(): string | null {
    return this.currentBtcPrice;
  }

  /**
   * 获取币安服务状态
   */
  getBinanceServiceStatus() {
    return this.binanceIndexService.getConnectionStatus();
  }

  /**
   * 获取游戏服务健康状态
   */
  getGameServiceHealth() {
    const gameStatus = this.gameService.getGameStatus();
    const binanceStatus = this.binanceIndexService.getConnectionStatus();
    const historicalPrices = this.gameService.getHistoricalPrices();

    return {
      game: {
        isActive: gameStatus.isActive,
        currentRound: gameStatus.currentRound
          ? {
              id: gameStatus.currentRound.id,
              phase: gameStatus.currentRound.phase,
              phaseRemainingTime: gameStatus.currentRound.phaseRemainingTime,
            }
          : null,
        historyCount: this.gameService.getGameHistory().length,
      },
      binance: {
        connected: binanceStatus.connected,
        lastMessageTime: binanceStatus.lastMessageTime,
        streams: binanceStatus.streams,
      },
      historicalPrices: {
        count: historicalPrices.length,
        latestPrice: historicalPrices[historicalPrices.length - 1]?.price,
        oldestPrice: historicalPrices[0]?.price,
        lastUpdate: historicalPrices[historicalPrices.length - 1]?.timestamp,
      },
      server: {
        connectedClients: this.server?.engine?.clientsCount || 0,
        currentBtcPrice: this.currentBtcPrice,
      },
    };
  }

  // WebSocket 事件处理器

  /**
   * 处理用户连接
   */
  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket): void {
    this.logger.log(`Client ${client.id} joined`);

    // 发送当前游戏状态
    this.sendGameStatusToClient(client);
  }

  /**
   * 处理投注请求
   */
  @SubscribeMessage('placeBet')
  @UseGuards(WsGuard)
  async handlePlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { userId: string; direction: BetDirection; amount: number },
  ): Promise<void> {
    const user = client.handshake.auth.user;
    const { sub: userId, nickname } = user;
    console.log('user', user);
    const betRequest: BetRequest = {
      userId: userId,
      nickname: nickname,
      direction: data.direction,
      amount: data.amount,
    };

    const result = await this.gameService.placeBet(betRequest);

    if (result.success) {
      client.emit('betPlaced', {
        success: true,
        message: result.message,
        bet: result.bet,
      });

      // 广播更新后的游戏状态
      this.broadcastGameStatus();
    } else {
      client.emit('betPlaced', {
        success: false,
        message: result.message,
      });
    }
  }

  /**
   * 获取用户投注状态
   */
  @SubscribeMessage('getUserBet')
  @UseGuards(WsGuard)
  handleGetUserBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ): void {
    const user = client.handshake.auth.user;
    const { sub: userId, nickname } = user;
    const userBet = this.gameService.findUserBet(data.userId);

    client.emit('userBet', {
      userId: data.userId,
      bet: userBet,
    });
  }

  /**
   * 获取用户投注历史（从数据库）
   */
  @SubscribeMessage('getUserBetHistory')
  @UseGuards(WsGuard)
  async handleGetUserBetHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { limit?: number; offset?: number },
  ): Promise<void> {
    try {
      const user = client.handshake.auth.user;
      const { sub: userId } = user;
      const result = await this.gameService.getUserBetHistory(
        userId,
        data.limit || 50,
        data.offset || 0,
      );

      client.emit('userBetHistory', {
        bets: result.bets,
        total: result.total,
        limit: data.limit || 50,
        offset: data.offset || 0,
      });
    } catch (error) {
      this.logger.error('获取用户投注历史失败:', error);
      client.emit('error', {
        message: '获取用户投注历史失败',
        error: error.message,
      });
    }
  }

  /**
   * 获取游戏轮次历史（从数据库）
   */
  @SubscribeMessage('getGameRoundHistory')
  async handleGetGameRoundHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { limit?: number; offset?: number },
  ): Promise<void> {
    try {
      const result = await this.gameService.getGameRoundHistory(
        data.limit || 50,
        data.offset || 0,
      );

      client.emit('gameRoundHistory', {
        rounds: result.rounds,
        total: result.total,
        limit: data.limit || 50,
        offset: data.offset || 0,
      });
    } catch (error) {
      this.logger.error('获取游戏轮次历史失败:', error);
      client.emit('error', {
        message: '获取游戏轮次历史失败',
        error: error.message,
      });
    }
  }

  /**
   * 获取用户投注统计
   */
  @SubscribeMessage('getUserBettingStats')
  @UseGuards(WsGuard)
  async handleGetUserBettingStats(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      startDate?: string;
      endDate?: string;
    },
  ): Promise<void> {
    try {
      const user = client.handshake.auth.user;
      const { sub: userId } = user;
      const startDate = data.startDate ? new Date(data.startDate) : undefined;
      const endDate = data.endDate ? new Date(data.endDate) : undefined;

      const stats = await this.gameService.getUserBettingStats(
        userId,
        startDate,
        endDate,
      );

      client.emit('userBettingStats', {
        stats,
        userId: userId,
        period: {
          startDate: data.startDate,
          endDate: data.endDate,
        },
      });
    } catch (error) {
      this.logger.error('获取用户投注统计失败:', error);
      client.emit('error', {
        message: '获取用户投注统计失败',
        error: error.message,
      });
    }
  }

  /**
   * 获取当前游戏状态
   */
  @SubscribeMessage('getGameStatus')
  handleGetGameStatus(@ConnectedSocket() client: Socket): void {
    this.sendGameStatusToClient(client);
  }

  /**
   * 获取游戏服务健康状态
   */
  @SubscribeMessage('getGameHealth')
  handleGetGameHealth(@ConnectedSocket() client: Socket): void {
    const health = this.getGameServiceHealth();
    client.emit('gameHealth', health);
  }

  /**
   * 发送游戏状态给特定客户端
   */
  private sendGameStatusToClient(client: Socket): void {
    const gameStatus = this.gameService.getGameStatus();
    if (!gameStatus.currentRound) return;

    // 更新剩余时间
    this.gameService.updatePhaseRemainingTime();

    // 计算赔率
    const { upOdds, downOdds } = this.gameService.calculateOdds();

    client.emit('gameStatus', {
      roundId: gameStatus.currentRound.id,
      phase: gameStatus.currentRound.phase,
      phaseRemainingTime: gameStatus.currentRound.phaseRemainingTime,
      lockedPrice: gameStatus.currentRound.lockedPrice,
      closedPrice: gameStatus.currentRound.closedPrice,
      currentPrice: this.currentBtcPrice,
      bettingPool: {
        upTotal: gameStatus.currentRound.bettingPool.upTotal,
        downTotal: gameStatus.currentRound.bettingPool.downTotal,
        totalPool: gameStatus.currentRound.bettingPool.totalPool,
        upBets: gameStatus.currentRound.bettingPool.upBets,
        downBets: gameStatus.currentRound.bettingPool.downBets,
      },
      odds: {
        up: upOdds,
        down: downOdds,
      },
      platformFee: gameStatus.platformFee,
      minBetAmount: gameStatus.minBetAmount,
    });

    // 同时发送历史价格数据
    this.sendHistoricalPricesToClient(client);
  }

  /**
   * 发送历史价格数据给特定客户端
   */
  private sendHistoricalPricesToClient(client: Socket): void {
    const historicalPrices = this.gameService.getRecentHistoricalPrices(100);

    client.emit('historicalPrices', {
      prices: historicalPrices,
      count: historicalPrices.length,
    });
  }

  /**
   * 处理客户端断开连接
   */
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  /**
   * 异步加载历史价格数据（不阻塞游戏启动）
   */
  private loadHistoricalPricesAsync(): void {
    // 使用 setTimeout 确保不阻塞主线程
    setTimeout(async () => {
      await this.loadHistoricalPrices();
    }, 1000); // 延迟1秒后开始加载，确保币安服务完全启动
  }

  /**
   * 加载历史价格数据
   */
  private async loadHistoricalPrices(): Promise<void> {
    try {
      this.logger.log('📈 开始加载历史价格数据...');

      // 获取最近24小时的历史价格数据
      const historicalPrices =
        await this.binanceIndexService.getRecentHistoricalPrices('BTCUSDT', 24);

      // 将历史价格数据存储到游戏服务中
      this.gameService.setHistoricalPrices(historicalPrices);

      this.logger.log(`✅ 成功加载 ${historicalPrices.length} 条历史价格记录`);

      // 广播历史价格数据给所有连接的客户端
      this.broadcastHistoricalPrices();
    } catch (error) {
      this.logger.error('❌ 加载历史价格数据失败:', error);

      // 尝试重试加载
      this.retryLoadHistoricalPrices();
    }
  }

  /**
   * 重试加载历史价格数据
   */
  private retryLoadHistoricalPrices(): void {
    this.logger.log('🔄 将在30秒后重试加载历史价格数据...');

    setTimeout(async () => {
      try {
        this.logger.log('🔄 重试加载历史价格数据...');
        await this.loadHistoricalPrices();
      } catch (error) {
        this.logger.error('❌ 重试加载历史价格数据失败:', error);
        // 可以继续重试或放弃
      }
    }, 30000); // 30秒后重试
  }

  /**
   * 获取历史价格数据
   */
  @SubscribeMessage('getHistoricalPrices')
  handleGetHistoricalPrices(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { limit?: number },
  ): void {
    const limit = data.limit || 100;
    const historicalPrices = this.gameService.getRecentHistoricalPrices(limit);

    client.emit('historicalPrices', {
      prices: historicalPrices,
      count: historicalPrices.length,
      limit,
    });
  }
}
