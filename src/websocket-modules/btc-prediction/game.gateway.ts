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
  cors: {
    origin: '*',
  },
})
@Injectable()
export class EventsGateway {
  protected readonly logger = new Logger(EventsGateway.name);
  private currentBtcPrice: string | null = null;
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

  async setup() {
    // 启动游戏服务
    this.gameService.start();

    // 启动币安指数价格服务
    await this.binanceIndexService.start();

    // 获取历史价格数据
    await this.loadHistoricalPrices();

    // 注册价格回调
    this.binanceIndexService.addPriceCallback((data: BinanceIndexPriceData) => {
      this.handleBtcPriceUpdate(data);
    });

    // 启动游戏循环
    this.startGameLoop();

    // 开始第一轮游戏
    this.startNewGameRound();
  }

  /**
   * 加载历史价格数据
   */
  private async loadHistoricalPrices(): Promise<void> {
    try {
      this.logger.log('Loading historical price data...');

      // 获取最近24小时的历史价格数据
      const historicalPrices =
        await this.binanceIndexService.getRecentHistoricalPrices('BTCUSDT', 24);

      // 将历史价格数据存储到游戏服务中
      this.gameService.setHistoricalPrices(historicalPrices);

      this.logger.log(
        `Successfully loaded ${historicalPrices.length} historical price records`,
      );

      // 广播历史价格数据给所有连接的客户端
      this.broadcastHistoricalPrices();
    } catch (error) {
      this.logger.error('Failed to load historical prices:', error);
      // 即使历史价格加载失败，游戏仍然可以继续运行
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
  private startNewGameRound(): void {
    const newRound = this.gameService.startNewRound();
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
  private settleGame(): void {
    try {
      const { round, results } = this.gameService.settleGame();

      // 广播结算结果
      this.server?.emit('gameSettled', {
        roundId: round.id,
        result: round.result,
        lockedPrice: round.lockedPrice,
        closedPrice: round.closedPrice,
        results: results,
      });

      this.logger.log(`Game settled: ${round.result}`);

      // 延迟3秒后开始新轮次
      setTimeout(() => {
        this.startNewGameRound();
      }, 3000);
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
      closedPrice: gameStatus.currentRound.closedPrice,
      currentPrice: this.currentBtcPrice,
      bettingPool: {
        upTotal: gameStatus.currentRound.bettingPool.upTotal,
        downTotal: gameStatus.currentRound.bettingPool.downTotal,
        totalPool: gameStatus.currentRound.bettingPool.totalPool,
      },
      odds: {
        up: upOdds,
        down: downOdds,
      },
      platformFee: gameStatus.platformFee,
      minBetAmount: gameStatus.minBetAmount,
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

    // 广播价格更新给所有连接的客户端
    this.server?.emit('btcPriceUpdate', {
      symbol: data.symbol,
      price: data.price,
      timestamp: data.timestamp,
    });

    // this.logger.debug(`BTC Price updated: ${data.price}`);
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
  handlePlaceBet(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { userId: string; direction: BetDirection; amount: number },
  ): void {
    const user = client.handshake.auth.user;

    const betRequest: BetRequest = {
      userId: user.sub,
      direction: data.direction,
      amount: data.amount,
    };

    const result = this.gameService.placeBet(betRequest);

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
  handleGetUserBet(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ): void {
    const userBet = this.gameService.findUserBet(data.userId);

    client.emit('userBet', {
      userId: data.userId,
      bet: userBet,
    });
  }

  /**
   * 获取游戏历史
   */
  @SubscribeMessage('getGameHistory')
  handleGetGameHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { limit?: number },
  ): void {
    const history = this.gameService.getGameHistory(data.limit || 10);

    client.emit('gameHistory', {
      history,
    });
  }

  /**
   * 获取当前游戏状态
   */
  @SubscribeMessage('getGameStatus')
  handleGetGameStatus(@ConnectedSocket() client: Socket): void {
    this.sendGameStatusToClient(client);
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

  /**
   * 刷新历史价格数据
   */
  @SubscribeMessage('refreshHistoricalPrices')
  async handleRefreshHistoricalPrices(
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    try {
      this.logger.log('Refreshing historical prices...');

      // 重新获取历史价格数据
      const historicalPrices =
        await this.binanceIndexService.getRecentHistoricalPrices('BTCUSDT', 24);

      // 更新游戏服务中的历史价格数据
      this.gameService.setHistoricalPrices(historicalPrices);

      // 发送给请求的客户端
      client.emit('historicalPrices', {
        prices: historicalPrices,
        count: historicalPrices.length,
      });

      // 广播给所有客户端
      this.broadcastHistoricalPrices();

      this.logger.log(
        `Refreshed ${historicalPrices.length} historical price records`,
      );
    } catch (error) {
      this.logger.error('Failed to refresh historical prices:', error);
      client.emit('error', {
        message: 'Failed to refresh historical prices',
        error: error.message,
      });
    }
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
}
