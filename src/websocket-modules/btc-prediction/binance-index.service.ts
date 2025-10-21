import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import * as WebSocket from 'ws';
import axios from 'axios';

export interface BinanceIndexPriceData {
  symbol: string;
  price: string;
  timestamp: number;
}

export interface HistoricalPriceData {
  symbol: string;
  price: string;
  timestamp: number;
  openTime: number;
  closeTime: number;
}

export interface BinanceIndexConfig {
  baseUrl?: string;
  streams?: string[];
  reconnectInterval?: number;
  pingInterval?: number;
  healthCheckInterval?: number;
}

@Injectable()
export class BinanceIndexService implements OnModuleDestroy {
  private readonly logger = new Logger(BinanceIndexService.name);
  private ws: WebSocket | null = null;
  private lastMessageTime = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private pingInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private priceCallbacks: ((data: BinanceIndexPriceData) => void)[] = [];

  private readonly config: Required<BinanceIndexConfig> = {
    baseUrl: 'wss://nbstream.binance.com/eoptions',
    streams: ['BTCUSDT@index'],
    reconnectInterval: 2000,
    pingInterval: 4 * 60 * 1000, // 4分钟
    healthCheckInterval: 2000,
  };

  constructor() {
    this.config = { ...this.config };
  }

  /**
   * 启动币安指数价格服务
   */
  async start(): Promise<void> {
    this.logger.log('Starting Binance Index Price Service...');
    await this.connect();
  }

  /**
   * 停止服务
   */
  async stop(): Promise<void> {
    this.logger.log('Stopping Binance Index Price Service...');
    this.cleanup();
  }

  /**
   * 添加价格回调函数
   */
  addPriceCallback(callback: (data: BinanceIndexPriceData) => void): void {
    this.priceCallbacks.push(callback);
  }

  /**
   * 移除价格回调函数
   */
  removePriceCallback(callback: (data: BinanceIndexPriceData) => void): void {
    const index = this.priceCallbacks.indexOf(callback);
    if (index > -1) {
      this.priceCallbacks.splice(index, 1);
    }
  }

  /**
   * 获取当前连接状态
   */
  getConnectionStatus(): {
    connected: boolean;
    lastMessageTime: number;
    streams: string[];
  } {
    return {
      connected: this.ws?.readyState === WebSocket.OPEN,
      lastMessageTime: this.lastMessageTime,
      streams: this.config.streams,
    };
  }

  /**
   * 获取历史价格数据
   */
  async getHistoricalPrices(
    symbol = 'BTCUSDT',
    interval = '1m',
    limit = 100,
    endTime?: number,
  ): Promise<HistoricalPriceData[]> {
    try {
      this.logger.log(`Fetching historical prices for ${symbol}...`);

      const baseUrl = 'https://api.binance.com/api/v3/klines';
      const params = new URLSearchParams({
        symbol,
        interval,
        limit: limit.toString(),
      });

      if (endTime) {
        params.append('endTime', endTime.toString());
      }

      const response = await axios.get(`${baseUrl}?${params}`, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const klines = response.data;
      const historicalData: HistoricalPriceData[] = klines.map(
        (kline: any[]) => ({
          symbol,
          price: kline[4], // 收盘价
          timestamp: kline[6], // 收盘时间
          openTime: kline[0], // 开盘时间
          closeTime: kline[6], // 收盘时间
        }),
      );

      this.logger.log(
        `Successfully fetched ${historicalData.length} historical price records`,
      );
      return historicalData;
    } catch (error) {
      this.logger.error('Failed to fetch historical prices:', error);
      throw error;
    }
  }

  /**
   * 获取最近的历史价格数据（用于游戏启动时显示历史趋势）
   */
  async getRecentHistoricalPrices(
    symbol = 'BTCUSDT',
    hours = 24,
  ): Promise<HistoricalPriceData[]> {
    const endTime = Date.now();
    const limit = Math.min(hours * 60, 1000); // 限制最大1000条记录

    return this.getHistoricalPrices(symbol, '1m', limit, endTime);
  }

  /**
   * 建立 WebSocket 连接
   */
  private async connect(): Promise<void> {
    try {
      const streamParam = this.config.streams.join('/');
      const url = `${this.config.baseUrl}/stream?streams=${streamParam}`;

      this.logger.log(`Connecting to: ${url}`);
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        this.logger.log('✅ Connected to Binance eOptions WebSocket');
        this.lastMessageTime = Date.now();
        this.startHealthCheck();
      });

      this.ws.on('message', (raw: Buffer) => {
        this.handleMessage(raw);
      });

      this.ws.on('ping', () => {
        this.logger.debug('↔️ Received ping, sending pong');
        this.ws?.pong();
      });

      this.ws.on('error', (err) => {
        this.logger.error('❌ WebSocket error:', err.message);
        this.reconnect();
      });

      this.ws.on('close', () => {
        this.logger.warn('⚠️ WebSocket closed');
        this.reconnect();
      });
    } catch (error) {
      this.logger.error('Failed to connect to Binance WebSocket:', error);
      this.reconnect();
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(raw: Buffer): void {
    try {
      const msg = JSON.parse(raw.toString());
      this.lastMessageTime = Date.now();

      // 判断是否为组合流格式 {"stream": "...", "data": {...}}
      const data = msg.data || msg;

      if (data.e === 'index') {
        const priceData: BinanceIndexPriceData = {
          symbol: data.s,
          price: data.p,
          timestamp: data.E || Date.now(),
        };

        // this.logger.debug(
        //   `📈 [${priceData.symbol}] Index Price: ${priceData.price}`,
        // );

        // 调用所有注册的回调函数
        this.priceCallbacks.forEach((callback) => {
          try {
            callback(priceData);
          } catch (error) {
            this.logger.error('Error in price callback:', error);
          }
        });
      } else if (msg.result === null && msg.id) {
        this.logger.debug('✅ Subscription confirmed');
      }
    } catch (err) {
      this.logger.error('⚠️ JSON parse error:', err.message);
    }
  }

  /**
   * 启动健康检查和心跳机制
   */
  private startHealthCheck(): void {
    this.clearIntervals();

    // 定期发送 pong 防止断开
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.pong();
        this.logger.debug('💓 Sent pong heartbeat');
      }
    }, this.config.pingInterval);

    // 检查是否收到新价格
    this.healthCheckInterval = setInterval(() => {
      const diff = Date.now() - this.lastMessageTime;
      if (diff > 5000) {
        this.logger.warn(
          `⏰ No new price for ${diff / 1000}s, reconnecting...`,
        );
        this.reconnect();
      }
    }, this.config.healthCheckInterval);
  }

  /**
   * 重连机制
   */
  private reconnect(): void {
    this.clearIntervals();

    if (this.ws) {
      try {
        this.ws.terminate();
      } catch (error) {
        this.logger.error('Error terminating WebSocket:', error);
      }
    }

    this.logger.log(
      `🔁 Reconnecting in ${this.config.reconnectInterval / 1000} seconds...`,
    );
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, this.config.reconnectInterval);
  }

  /**
   * 清理所有定时器
   */
  private clearIntervals(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.clearIntervals();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        this.logger.error('Error closing WebSocket:', error);
      }
      this.ws = null;
    }

    this.priceCallbacks = [];
  }

  /**
   * 模块销毁时清理资源
   */
  onModuleDestroy(): void {
    this.cleanup();
  }
}
