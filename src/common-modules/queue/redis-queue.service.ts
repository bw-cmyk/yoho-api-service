import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RedisService } from '../redis/redis.service';

export interface ApiRequestData {
  id: string;
  apiPath: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  requestFunctionId: string; // 请求函数ID
  callbackFunctionId: string; // 回调函数ID
  priority: number;
  timestamp: number;
  instanceId: string;
  queryParams?: Record<string, string>;
}

export interface ApiResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

export interface RedisQueueConfig {
  maxConcurrent?: number;
  processInterval?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  lockTimeout?: number; // 分布式锁超时时间
}

@Injectable()
export class RedisQueueService {
  private readonly logger = new Logger(RedisQueueService.name);
  private readonly instanceId = `instance_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  private config: RedisQueueConfig;
  private processing = false;

  // Redis键名常量
  private readonly QUEUE_KEY = 'api_queue:requests';
  private readonly PROCESSING_KEY = 'api_queue:processing';
  private readonly LOCK_KEY = 'api_queue:lock';
  private readonly API_LOCK_PREFIX = 'api_lock:';
  private readonly RETRY_COUNT_PREFIX = 'retry_count:';

  private callbackMap = new Map<string, (result: any, error?: any) => void>();
  private requestFnMap = new Map<string, (params: any) => Promise<any>>();

  constructor(private readonly redisService: RedisService) {
    this.config = {
      maxConcurrent: 1,
      processInterval: 1000, // 1 second
      maxRetries: 3,
      retryDelay: 2000, // 2 seconds
      lockTimeout: 30, // 30 seconds
    };
  }

  /**
   * 添加API请求到分布式队列
   */
  async addToQueue(
    apiPath: string,
    method: string,
    url: string,
    requestFunctionId: string,
    callbackFunctionId: string,
    headers?: Record<string, string>,
    body?: any,
    queryParams?: any,
    priority = 0,
  ): Promise<string> {
    const id = this.generateId();
    const requestData: ApiRequestData = {
      id,
      apiPath,
      method,
      url,
      headers,
      body,
      queryParams,
      requestFunctionId,
      callbackFunctionId,
      priority,
      timestamp: Date.now(),
      instanceId: this.instanceId,
    };

    // 检查是否已经有相同的API路径在处理中
    const apiLockKey = `${this.API_LOCK_PREFIX}${this.hashApiPath(apiPath)}`;
    const isProcessing = await this.redisService.exists(apiLockKey);

    if (isProcessing) {
      this.logger.log(
        `API path ${apiPath} is already being processed, adding to queue`,
      );
    }

    // 将请求添加到Redis队列
    const serializedItem = JSON.stringify(requestData);
    await this.redisService.lpush(this.QUEUE_KEY, serializedItem);

    this.logger.log(
      `Added request to Redis queue: ${id}, API path: ${apiPath}, queue length: ${await this.redisService.llen(
        this.QUEUE_KEY,
      )}`,
    );

    return id;
  }

  /**
   * 定时处理队列中的请求
   * 每秒执行一次
   */
  @Cron(CronExpression.EVERY_SECOND)
  async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    // 尝试获取分布式锁
    const lockAcquired = await this.redisService.acquireLock(
      this.LOCK_KEY,
      this.config.lockTimeout,
    );

    if (!lockAcquired) {
      return; // 其他实例正在处理
    }

    this.processing = true;
    try {
      const queueLength = await this.redisService.llen(this.QUEUE_KEY);
      if (queueLength === 0) {
        return;
      }

      // log
      this.logger.debug(`teest`)

      // 获取要处理的请求
      const itemsToProcess: ApiRequestData[] = [];
      for (let i = 0; i < this.config.maxConcurrent && i < queueLength; i++) {
        const serializedItem = await this.redisService.rpop(this.QUEUE_KEY);
        if (serializedItem) {
          try {
            const item = JSON.parse(serializedItem) as ApiRequestData;
            itemsToProcess.push(item);
          } catch (error) {
            this.logger.error('Failed to parse queue item:', error);
          }
        }
      }

      // 处理请求
      await Promise.all(
        itemsToProcess.map((item) => this.processQueueItem(item)),
      );
    } catch (error) {
      this.logger.error('Error processing Redis queue:', error);
    } finally {
      this.processing = false;
      // 释放分布式锁
      await this.redisService.releaseLock(this.LOCK_KEY);
    }
  }

  /**
   * 处理队列中的单个请求
   */
  private async processQueueItem(item: ApiRequestData): Promise<void> {
    const apiLockKey = `${this.API_LOCK_PREFIX}${this.hashApiPath(
      item.apiPath,
    )}`;

    try {
      // 获取API路径锁，防止重复请求
      const apiLockAcquired = await this.redisService.acquireLock(
        apiLockKey,
        this.config.lockTimeout,
      );

      if (!apiLockAcquired) {
        // 如果无法获取锁，说明其他实例正在处理相同API路径
        this.logger.log(
          `API path ${item.apiPath} is being processed by another instance, skipping`,
        );
        // 将请求重新放回队列
        const serializedItem = JSON.stringify(item);
        await this.redisService.lpush(this.QUEUE_KEY, serializedItem);
        return;
      }

      this.logger.log(
        `Processing request: ${item.id}, API path: ${item.apiPath}`,
      );

      // 通过 requestFunctionId 获取请求函数并执行
      const requestFn = this.requestFnMap.get(item.requestFunctionId);
      if (!requestFn) {
        throw new Error(
          `Request function not found for ID: ${item.requestFunctionId}`,
        );
      }

      const requestParams = {
        method: item.method,
        url: item.url,
        headers: item.headers,
        body: item.body,
        queryParams: item.queryParams,
      };

      const result = await requestFn(requestParams);

      // 通过 callbackFunctionId 执行回调
      const callbackFn = this.callbackMap.get(item.callbackFunctionId);
      if (callbackFn) {
        try {
          callbackFn(result, requestParams);
        } catch (callbackError) {
          this.logger.error(
            `Callback error for request ${item.id}:`,
            callbackError,
          );
        }
      }

      // 清除重试计数
      await this.redisService.del(`${this.RETRY_COUNT_PREFIX}${item.id}`);

      this.logger.log(`Successfully processed request: ${item.id}`);
    } catch (error) {
      this.logger.error(`Error processing request ${item.id}:`, error);

      // 处理重试逻辑
      await this.handleRetry(item, error);
    } finally {
      // 释放API路径锁
      await this.redisService.releaseLock(apiLockKey);
    }
  }

  /**
   * 处理重试逻辑
   */
  private async handleRetry(item: ApiRequestData, error: any): Promise<void> {
    const retryKey = `${this.RETRY_COUNT_PREFIX}${item.id}`;
    const retryCount = parseInt((await this.redisService.get(retryKey)) || '0');

    if (retryCount < this.config.maxRetries) {
      await this.redisService.set(retryKey, (retryCount + 1).toString(), 3600); // 1小时过期

      this.logger.log(
        `Retrying request ${item.id}, attempt ${retryCount + 1}/${
          this.config.maxRetries
        }`,
      );

      // 延迟重试
      setTimeout(async () => {
        const serializedItem = JSON.stringify(item);
        await this.redisService.lpush(this.QUEUE_KEY, serializedItem);
      }, this.config.retryDelay);
    } else {
      // 达到最大重试次数，执行错误回调
      const callbackFn = this.callbackMap.get(item.callbackFunctionId);
      if (callbackFn) {
        try {
          callbackFn(null, error);
        } catch (callbackError) {
          this.logger.error(
            `Error callback error for request ${item.id}:`,
            callbackError,
          );
        }
      }

      await this.redisService.del(retryKey);
      this.logger.error(
        `Request ${item.id} failed after ${this.config.maxRetries} retries`,
      );
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 哈希API路径，用于生成锁键
   */
  private hashApiPath(apiPath: string): string {
    // 简单的哈希函数，实际项目中可以使用更复杂的哈希算法
    let hash = 0;
    for (let i = 0; i < apiPath.length; i++) {
      const char = apiPath.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 注册请求函数
   */
  registerRequestFunction(
    id: string,
    requestFunction: (params: any) => Promise<any>,
  ): void {
    if (this.requestFnMap.has(id)) {
      throw new Error(`Request function already registered for ID: ${id}`);
    }
    this.requestFnMap.set(id, requestFunction);
    this.logger.log(`Registered request function with ID: ${id}`);
  }

  /**
   * 注册回调函数
   */
  registerCallbackFunction(
    id: string,
    callbackFunction: (result: any, error?: any) => void,
  ): void {
    if (this.callbackMap.has(id)) {
      throw new Error(`Callback function already registered for ID: ${id}`);
    }
    this.callbackMap.set(id, callbackFunction);
    this.logger.log(`Registered callback function with ID: ${id}`);
  }

  /**
   * 获取已注册的请求函数ID列表
   */
  getRegisteredRequestFunctionIds(): string[] {
    return Array.from(this.requestFnMap.keys());
  }

  /**
   * 获取已注册的回调函数ID列表
   */
  getRegisteredCallbackFunctionIds(): string[] {
    return Array.from(this.callbackMap.keys());
  }

  /**
   * 注销请求函数
   */
  unregisterRequestFunction(id: string): boolean {
    const removed = this.requestFnMap.delete(id);
    if (removed) {
      this.logger.log(`Unregistered request function with ID: ${id}`);
    }
    return removed;
  }

  /**
   * 注销回调函数
   */
  unregisterCallbackFunction(id: string): boolean {
    const removed = this.callbackMap.delete(id);
    if (removed) {
      this.logger.log(`Unregistered callback function with ID: ${id}`);
    }
    return removed;
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus(): Promise<{
    queueLength: number;
    processing: boolean;
    instanceId: string;
  }> {
    const queueLength = await this.redisService.llen(this.QUEUE_KEY);
    return {
      queueLength,
      processing: this.processing,
      instanceId: this.instanceId,
    };
  }

  /**
   * 清空队列
   */
  async clearQueue(): Promise<void> {
    await this.redisService.del(this.QUEUE_KEY);
    this.logger.log('Redis queue cleared');
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RedisQueueConfig>): void {
    this.config = { ...this.config, ...config };
    this.logger.log('Redis queue configuration updated:', this.config);
  }

  /**
   * 获取队列中的所有项目
   */
  async getQueueItems(): Promise<ApiRequestData[]> {
    const items = await this.redisService.lrange(this.QUEUE_KEY, 0, -1);
    return items
      .map((item) => {
        try {
          return JSON.parse(item) as ApiRequestData;
        } catch (error) {
          this.logger.error('Failed to parse queue item:', error);
          return null;
        }
      })
      .filter((item) => item !== null) as ApiRequestData[];
  }

  /**
   * 移除特定ID的请求
   */
  async removeFromQueue(id: string): Promise<boolean> {
    const items = await this.getQueueItems();
    const itemToRemove = items.find((item) => item.id === id);

    if (itemToRemove) {
      // 从队列中移除项目（Redis列表不支持直接删除指定元素，需要重建）
      const filteredItems = items.filter((item) => item.id !== id);

      // 清空队列并重新添加过滤后的项目
      await this.redisService.del(this.QUEUE_KEY);
      for (const item of filteredItems) {
        await this.redisService.lpush(this.QUEUE_KEY, JSON.stringify(item));
      }

      this.logger.log(`Removed request from Redis queue: ${id}`);
      return true;
    }

    return false;
  }
}
