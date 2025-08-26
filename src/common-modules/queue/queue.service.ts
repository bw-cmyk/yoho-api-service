import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface QueueItem {
  id: string;
  request: () => Promise<any>;
  callback?: (result: any, error?: any) => void;
  priority?: number;
  timestamp: number;
}

export interface QueueConfig {
  maxConcurrent?: number;
  processInterval?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  private queue: QueueItem[] = [];
  private processing = false;
  private config: QueueConfig;
  private retryMap = new Map<string, number>();

  constructor() {
    this.config = {
      maxConcurrent: 1,
      processInterval: 1000, // 1 second
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds
    };
  }

  /**
   * 添加请求到队列
   */
  async addToQueue(
    request: () => Promise<any>,
    callback?: (result: any, error?: any) => void,
    priority = 0,
  ): Promise<string> {
    const id = this.generateId();
    const queueItem: QueueItem = {
      id,
      request,
      callback,
      priority,
      timestamp: Date.now(),
    };

    // 按优先级插入队列
    this.insertByPriority(queueItem);

    this.logger.log(
      `Added request to queue: ${id}, queue length: ${this.queue.length}`,
    );

    return id;
  }

  /**
   * 按优先级插入队列
   */
  private insertByPriority(item: QueueItem): void {
    const insertIndex = this.queue.findIndex(
      (queueItem) => queueItem.priority < item.priority,
    );

    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 定时处理队列中的请求
   * 每秒执行一次
   */
  @Cron(CronExpression.EVERY_SECOND)
  async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      const itemsToProcess = this.queue.splice(0, this.config.maxConcurrent);

      await Promise.all(
        itemsToProcess.map((item) => this.processQueueItem(item)),
      );
    } catch (error) {
      this.logger.error('Error processing queue:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * 处理队列中的单个请求
   */
  private async processQueueItem(item: QueueItem): Promise<void> {
    try {
      this.logger.log(`Processing request: ${item.id}`);

      const result = await item.request();

      // 执行回调
      if (item.callback) {
        try {
          item.callback(result);
        } catch (callbackError) {
          this.logger.error(
            `Callback error for request ${item.id}:`,
            callbackError,
          );
        }
      }

      // 清除重试计数
      this.retryMap.delete(item.id);

      this.logger.log(`Successfully processed request: ${item.id}`);
    } catch (error) {
      this.logger.error(`Error processing request ${item.id}:`, error);

      // 处理重试逻辑
      await this.handleRetry(item, error);
    }
  }

  /**
   * 处理重试逻辑
   */
  private async handleRetry(item: QueueItem, error: any): Promise<void> {
    const retryCount = this.retryMap.get(item.id) || 0;

    if (retryCount < this.config.maxRetries) {
      this.retryMap.set(item.id, retryCount + 1);

      this.logger.log(
        `Retrying request ${item.id}, attempt ${retryCount + 1}/${
          this.config.maxRetries
        }`,
      );

      // 延迟重试
      setTimeout(() => {
        this.insertByPriority(item);
      }, this.config.retryDelay);
    } else {
      // 达到最大重试次数，执行错误回调
      if (item.callback) {
        try {
          item.callback(null, error);
        } catch (callbackError) {
          this.logger.error(
            `Error callback error for request ${item.id}:`,
            callbackError,
          );
        }
      }

      this.retryMap.delete(item.id);
      this.logger.error(
        `Request ${item.id} failed after ${this.config.maxRetries} retries`,
      );
    }
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): {
    queueLength: number;
    processing: boolean;
    retryCount: number;
  } {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      retryCount: this.retryMap.size,
    };
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.queue = [];
    this.retryMap.clear();
    this.logger.log('Queue cleared');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<QueueConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Queue configuration updated:', this.config);
  }

  /**
   * 获取队列中的所有项目
   */
  getQueueItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * 移除特定ID的请求
   */
  removeFromQueue(id: string): boolean {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.retryMap.delete(id);
      this.logger.log(`Removed request from queue: ${id}`);
      return true;
    }
    return false;
  }
}
