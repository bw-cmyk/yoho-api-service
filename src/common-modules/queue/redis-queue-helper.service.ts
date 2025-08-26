import { Injectable } from '@nestjs/common';
import { RedisQueueSimpleService, ApiResponse } from './redis-queue-simple.service';

@Injectable()
export class RedisQueueHelperService {
  constructor(private readonly redisQueueService: RedisQueueSimpleService) {}

  /**
   * 添加GET请求到队列
   */
  async addGetRequest(
    apiPath: string,
    url: string,
    headers?: Record<string, string>,
    priority = 0,
  ): Promise<string> {
    return this.redisQueueService.addApiRequest(
      apiPath,
      'GET',
      url,
      headers,
      undefined,
      priority,
    );
  }

  /**
   * 添加POST请求到队列
   */
  async addPostRequest(
    apiPath: string,
    url: string,
    body?: any,
    headers?: Record<string, string>,
    priority = 0,
  ): Promise<string> {
    return this.redisQueueService.addApiRequest(
      apiPath,
      'POST',
      url,
      headers,
      body,
      priority,
    );
  }

  /**
   * 添加PUT请求到队列
   */
  async addPutRequest(
    apiPath: string,
    url: string,
    body?: any,
    headers?: Record<string, string>,
    priority = 0,
  ): Promise<string> {
    return this.redisQueueService.addApiRequest(
      apiPath,
      'PUT',
      url,
      headers,
      body,
      priority,
    );
  }

  /**
   * 添加DELETE请求到队列
   */
  async addDeleteRequest(
    apiPath: string,
    url: string,
    headers?: Record<string, string>,
    priority = 0,
  ): Promise<string> {
    return this.redisQueueService.addApiRequest(
      apiPath,
      'DELETE',
      url,
      headers,
      undefined,
      priority,
    );
  }

  /**
   * 等待请求结果
   */
  async waitForResult(requestId: string, timeout = 30000): Promise<ApiResponse> {
    return this.redisQueueService.waitForResult(requestId, timeout);
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    return this.redisQueueService.getQueueStatus();
  }

  /**
   * 清空队列
   */
  async clearQueue(): Promise<void> {
    return this.redisQueueService.clearQueue();
  }

  /**
   * 获取队列中的所有请求
   */
  async getQueueItems() {
    return this.redisQueueService.getQueueItems();
  }
} 