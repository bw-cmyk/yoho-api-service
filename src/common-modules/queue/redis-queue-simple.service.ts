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
  priority: number;
  timestamp: number;
  instanceId: string;
}

export interface ApiResponse {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  statusCode?: number;
}

@Injectable()
export class RedisQueueSimpleService {
  private readonly logger = new Logger(RedisQueueSimpleService.name);
  private readonly instanceId = `instance_${Date.now()}_${Math.random()
    .toString(36)
    .substr(2, 9)}`;
  private processing = false;

  // Redis键名常量
  private readonly QUEUE_KEY = 'api_queue:requests';
  private readonly RESULTS_KEY = 'api_queue:results';
  private readonly LOCK_KEY = 'api_queue:lock';
  private readonly API_LOCK_PREFIX = 'api_lock:';
  private readonly RETRY_COUNT_PREFIX = 'retry_count:';

  constructor(private readonly redisService: RedisService) {}

  /**
   * 添加API请求到分布式队列
   */
  async addApiRequest(
    apiPath: string,
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: any,
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
    const serializedRequest = JSON.stringify(requestData);
    await this.redisService.lpush(this.QUEUE_KEY, serializedRequest);

    this.logger.log(
      `Added API request to Redis queue: ${id}, API path: ${apiPath}, queue length: ${await this.redisService.llen(
        this.QUEUE_KEY,
      )}`,
    );

    return id;
  }

  /**
   * 等待API请求结果
   */
  async waitForResult(requestId: string, timeout = 30000): Promise<ApiResponse> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const result = await this.redisService.hget(this.RESULTS_KEY, requestId);
      if (result) {
        const response = JSON.parse(result) as ApiResponse;
        // 清理结果
        await this.redisService.hdel(this.RESULTS_KEY, requestId);
        return response;
      }
      
      // 等待100ms后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Timeout waiting for result of request ${requestId}`);
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
    const lockAcquired = await this.redisService.acquireLock(this.LOCK_KEY, 30);

    if (!lockAcquired) {
      return; // 其他实例正在处理
    }

    this.processing = true;

    try {
      const queueLength = await this.redisService.llen(this.QUEUE_KEY);
      if (queueLength === 0) {
        return;
      }

      // 获取要处理的请求（每次只处理一个，确保API路径不重复）
      const serializedRequest = await this.redisService.rpop(this.QUEUE_KEY);
      if (serializedRequest) {
        try {
          const requestData = JSON.parse(serializedRequest) as ApiRequestData;
          await this.processApiRequest(requestData);
        } catch (error) {
          this.logger.error('Failed to parse queue request:', error);
        }
      }
    } catch (error) {
      this.logger.error('Error processing Redis queue:', error);
    } finally {
      this.processing = false;
      // 释放分布式锁
      await this.redisService.releaseLock(this.LOCK_KEY);
    }
  }

  /**
   * 处理单个API请求
   */
  private async processApiRequest(requestData: ApiRequestData): Promise<void> {
    const apiLockKey = `${this.API_LOCK_PREFIX}${this.hashApiPath(
      requestData.apiPath,
    )}`;

    try {
      // 获取API路径锁，防止重复请求
      const apiLockAcquired = await this.redisService.acquireLock(
        apiLockKey,
        30,
      );

      if (!apiLockAcquired) {
        // 如果无法获取锁，说明其他实例正在处理相同API路径
        this.logger.log(
          `API path ${requestData.apiPath} is being processed by another instance, skipping`,
        );
        // 将请求重新放回队列
        const serializedRequest = JSON.stringify(requestData);
        await this.redisService.lpush(this.QUEUE_KEY, serializedRequest);
        return;
      }

      this.logger.log(
        `Processing API request: ${requestData.id}, API path: ${requestData.apiPath}`,
      );

      // 执行API请求
      const response = await this.executeApiRequest(requestData);

      // 存储结果
      await this.redisService.hset(
        this.RESULTS_KEY,
        requestData.id,
        JSON.stringify(response),
      );

      // 设置结果过期时间（1小时）
      await this.redisService.expire(this.RESULTS_KEY, 3600);

      this.logger.log(`Successfully processed API request: ${requestData.id}`);
    } catch (error) {
      this.logger.error(`Error processing API request ${requestData.id}:`, error);

      // 存储错误结果
      const errorResponse: ApiResponse = {
        id: requestData.id,
        success: false,
        error: error.message,
      };

      await this.redisService.hset(
        this.RESULTS_KEY,
        requestData.id,
        JSON.stringify(errorResponse),
      );

      // 处理重试逻辑
      await this.handleRetry(requestData, error);
    } finally {
      // 释放API路径锁
      await this.redisService.releaseLock(apiLockKey);
    }
  }

  /**
   * 执行API请求
   */
  private async executeApiRequest(requestData: ApiRequestData): Promise<ApiResponse> {
    const { method, url, headers, body } = requestData;

    try {
      // 这里应该使用实际的HTTP客户端（如axios）
      // 为了演示，我们模拟一个API调用
      const response = await this.mockApiCall(method, url, headers, body);

      return {
        id: requestData.id,
        success: true,
        data: response,
        statusCode: 200,
      };
    } catch (error) {
      return {
        id: requestData.id,
        success: false,
        error: error.message,
        statusCode: error.statusCode || 500,
      };
    }
  }

  /**
   * 模拟API调用（实际项目中应该使用真实的HTTP客户端）
   */
  private async mockApiCall(
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: any,
  ): Promise<any> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 模拟偶尔的失败
    if (Math.random() < 0.1) {
      throw new Error('API service temporarily unavailable');
    }

    return {
      method,
      url,
      headers,
      body,
      response: 'Mock API response',
      timestamp: Date.now(),
    };
  }

  /**
   * 处理重试逻辑
   */
  private async handleRetry(requestData: ApiRequestData, error: any): Promise<void> {
    const retryKey = `${this.RETRY_COUNT_PREFIX}${requestData.id}`;
    const retryCount = parseInt(
      (await this.redisService.get(retryKey)) || '0',
    );

    if (retryCount < 3) {
      await this.redisService.set(retryKey, (retryCount + 1).toString(), 3600); // 1小时过期

      this.logger.log(
        `Retrying API request ${requestData.id}, attempt ${retryCount + 1}/3`,
      );

      // 延迟重试
      setTimeout(async () => {
        const serializedRequest = JSON.stringify(requestData);
        await this.redisService.lpush(this.QUEUE_KEY, serializedRequest);
      }, 2000);
    } else {
      await this.redisService.del(retryKey);
      this.logger.error(
        `API request ${requestData.id} failed after 3 retries`,
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
    let hash = 0;
    for (let i = 0; i < apiPath.length; i++) {
      const char = apiPath.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(36);
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
    await this.redisService.del(this.RESULTS_KEY);
    this.logger.log('Redis queue cleared');
  }

  /**
   * 获取队列中的所有请求
   */
  async getQueueItems(): Promise<ApiRequestData[]> {
    const items = await this.redisService.lrange(this.QUEUE_KEY, 0, -1);
    return items
      .map(item => {
        try {
          return JSON.parse(item) as ApiRequestData;
        } catch (error) {
          this.logger.error('Failed to parse queue item:', error);
          return null;
        }
      })
      .filter(item => item !== null) as ApiRequestData[];
  }
} 