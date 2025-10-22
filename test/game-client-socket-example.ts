import { io, Socket } from 'socket.io-client';

// 客户端连接类
export class GameClient {
  private socket: Socket;
  private isConnected = false;
  private userId: string;

  constructor(
    serverUrl = 'https://yoho-api-service-dev-ff05bf602cab.herokuapp.com',
    userId: string,
  ) {
    this.userId = userId;
    this.socket = io(serverUrl, {
      path: '/ws',
      transports: ['websocket', 'polling'],
      timeout: 10000,
      auth: {
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIzNzMzNTgyNzQwMjE3ODA0ODAiLCJpYXQiOjE3NjEwNjM5NjQsImV4cCI6MTc2MTY2ODc2NH0.F7L4ubd0oeoMCR2xNDeJD07FxCVcw8Cu9qRBmEulij4',
      },
    });

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 连接成功
    this.socket.on('connect', () => {
      console.log(`✅ 客户端 ${this.userId} 已连接到游戏服务器`);
      this.isConnected = true;

      // 连接后立即加入游戏
      this.socket.emit('join');
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log(`❌ 客户端 ${this.userId} 断开连接:`, reason);
      this.isConnected = false;
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error(`❌ 客户端 ${this.userId} 连接错误:`, error.message);
    });

    // 游戏状态更新
    this.socket.on('gameStatus', (data) => {
      console.log(`🎮 [${this.userId}] 游戏状态更新:`, data);
    });

    // 历史价格数据
    this.socket.on('historicalPrices', (data) => {
      console.log(`📈 [${this.userId}] 收到历史价格数据:`, {
        count: data.count,
        latestPrice: data.prices[data.prices.length - 1]?.price,
        priceRange: `${data.prices[0]?.price} - ${
          data.prices[data.prices.length - 1]?.price
        }`,
      });
    });

    // BTC价格更新
    this.socket.on('btcPriceUpdate', (data) => {
      console.log(`💰 [${this.userId}] BTC价格更新: ${data.price} USDT`);
    });

    // 投注结果
    this.socket.on('betPlaced', (result) => {
      if (result.success) {
        console.log(`✅ [${this.userId}] 投注成功:`, {
          direction: result.bet.direction,
          amount: result.bet.amount,
          timestamp: new Date(result.bet.timestamp).toLocaleString(),
        });
      } else {
        console.log(`❌ [${this.userId}] 投注失败: ${result.message}`);
      }
    });

    // 用户投注状态
    this.socket.on('userBet', (data) => {
      console.log(
        `🎯 [${this.userId}] 用户投注状态:`,
        data.bet
          ? {
              direction: data.bet.direction,
              amount: data.bet.amount,
            }
          : '无投注',
      );
    });

    // 游戏历史
    this.socket.on('gameHistory', (data) => {
      console.log(
        `📚 [${this.userId}] 游戏历史:`,
        data.history.map((h) => ({
          id: h.id,
          result: h.result,
          lockedPrice: h.lockedPrice,
          closedPrice: h.closedPrice,
        })),
      );
    });

    // 游戏结算
    this.socket.on('gameSettled', (data) => {
      console.log(`🏁 [${this.userId}] 游戏结算:`, {
        roundId: data.roundId,
        result: data.result,
        lockedPrice: data.lockedPrice,
        closedPrice: data.closedPrice,
      });
    });

    // 错误处理
    this.socket.on('error', (error) => {
      console.error(`🚨 [${this.userId}] 服务器错误:`, error);
    });
  }

  /**
   * 等待连接就绪
   */
  async waitForConnection(timeout = 10000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }

      const timer = setTimeout(() => {
        resolve(false);
      }, timeout);

      this.socket.once('connect', () => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }

  /**
   * 连接服务器
   */
  async connect(): Promise<boolean> {
    if (this.isConnected) {
      console.log(`客户端 ${this.userId} 已连接`);
      return true;
    }

    this.socket.connect();
    return await this.waitForConnection();
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.socket.disconnect();
  }

  /**
   * 放置投注
   */
  placeBet(direction: 'UP' | 'DOWN', amount: number): void {
    if (!this.isConnected) {
      console.error(`客户端 ${this.userId} 未连接，无法投注`);
      return;
    }

    console.log(`🎯 [${this.userId}] 放置投注: ${direction} ${amount} USDT`);
    this.socket.emit('placeBet', {
      userId: this.userId,
      direction,
      amount,
    });
  }

  /**
   * 获取用户投注状态
   */
  getUserBet(): void {
    if (!this.isConnected) return;

    console.log(`🔍 [${this.userId}] 查询用户投注状态`);
    this.socket.emit('getUserBet', { userId: this.userId });
  }

  /**
   * 获取游戏历史
   */
  getGameHistory(limit = 10): void {
    if (!this.isConnected) return;

    console.log(`📚 [${this.userId}] 获取游戏历史`);
    this.socket.emit('getGameHistory', { limit });
  }

  /**
   * 获取游戏状态
   */
  getGameStatus(): void {
    if (!this.isConnected) return;

    console.log(`🎮 [${this.userId}] 获取游戏状态`);
    this.socket.emit('getGameStatus');
  }

  /**
   * 获取历史价格数据
   */
  getHistoricalPrices(limit = 100): void {
    if (!this.isConnected) return;

    console.log(`📈 [${this.userId}] 获取历史价格数据`);
    this.socket.emit('getHistoricalPrices', { limit });
  }

  /**
   * 刷新历史价格数据
   */
  refreshHistoricalPrices(): void {
    if (!this.isConnected) return;

    console.log(`🔄 [${this.userId}] 刷新历史价格数据`);
    this.socket.emit('refreshHistoricalPrices');
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus() {
    return {
      connected: this.isConnected,
      socketId: this.socket.id,
      userId: this.userId,
    };
  }
}

// 简单客户端示例
export async function simpleClientExample() {
  console.log('=== 简单客户端示例 ===\n');

  const client = new GameClient('http://localhost:3000', 'simple-user');

  try {
    // 连接
    const connected = await client.connect();
    if (!connected) {
      console.error('连接失败');
      return;
    }

    // 等待连接稳定
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 获取游戏状态
    client.getGameStatus();

    // 等待3秒后投注
    setTimeout(() => {
      client.placeBet('UP', 1);
    }, 3000);

    // 等待6秒后查询状态
    setTimeout(() => {
      client.getUserBet();
      client.getHistoricalPrices(20);
    }, 6000);

    // 保持连接15秒
    await new Promise((resolve) => setTimeout(resolve, 15000));
  } catch (error) {
    console.error('简单客户端示例出错:', error);
  } finally {
    // client.disconnect();
  }
}

// 如果直接运行此文件
if (require.main === module) {
  simpleClientExample();
}
