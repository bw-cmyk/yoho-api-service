import { Injectable } from '@nestjs/common';
import { RedisQueueHelperService } from './redis-queue-helper.service';

@Injectable()
export class RedisQueueExampleService {
  constructor(private readonly redisQueueHelper: RedisQueueHelperService) {}

  /**
   * 示例：添加GET请求到分布式队列
   */
  async exampleGetRequest() {
    const apiPath = '/api/users/123';
    const url = 'https://api.example.com/users/123';

    // 添加GET请求到队列
    const requestId = await this.redisQueueHelper.addGetRequest(
      apiPath,
      url,
      { Authorization: 'Bearer token123' },
      1, // 优先级
    );

    console.log('GET request added to Redis queue with ID:', requestId);

    // 等待结果
    try {
      const result = await this.redisQueueHelper.waitForResult(
        requestId,
        30000,
      );
      if (result.success) {
        console.log('GET request successful:', result.data);
      } else {
        console.error('GET request failed:', result.error);
      }
    } catch (error) {
      console.error('Timeout waiting for result:', error);
    }
  }

  /**
   * 示例：添加POST请求到分布式队列
   */
  async examplePostRequest() {
    const apiPath = '/api/users';
    const url = 'https://api.example.com/users';
    const body = {
      name: 'John Doe',
      email: 'john@example.com',
    };

    // 添加POST请求到队列
    const requestId = await this.redisQueueHelper.addPostRequest(
      apiPath,
      url,
      body,
      { 'Content-Type': 'application/json' },
      2, // 高优先级
    );

    console.log('POST request added to Redis queue with ID:', requestId);

    // 等待结果
    try {
      const result = await this.redisQueueHelper.waitForResult(requestId);
      if (result.success) {
        console.log('POST request successful:', result.data);
      } else {
        console.error('POST request failed:', result.error);
      }
    } catch (error) {
      console.error('Timeout waiting for result:', error);
    }
  }

  /**
   * 示例：批量添加请求
   */
  async exampleBatchRequests() {
    const requests = [
      {
        apiPath: '/api/users/1',
        url: 'https://api.example.com/users/1',
        method: 'GET' as const,
      },
      {
        apiPath: '/api/users/2',
        url: 'https://api.example.com/users/2',
        method: 'GET' as const,
      },
      {
        apiPath: '/api/users/3',
        url: 'https://api.example.com/users/3',
        method: 'GET' as const,
      },
    ];

    const requestIds: string[] = [];

    // 添加所有请求到队列
    for (const request of requests) {
      const requestId = await this.redisQueueHelper.addGetRequest(
        request.apiPath,
        request.url,
      );
      requestIds.push(requestId);
    }

    console.log('Batch requests added to Redis queue with IDs:', requestIds);

    // 等待所有结果
    const results = await Promise.allSettled(
      requestIds.map((id) => this.redisQueueHelper.waitForResult(id)),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Request ${requestIds[index]} result:`, result.value);
      } else {
        console.error(`Request ${requestIds[index]} failed:`, result.reason);
      }
    });
  }

  /**
   * 示例：检查队列状态
   */
  async exampleCheckQueueStatus() {
    const status = await this.redisQueueHelper.getQueueStatus();
    console.log('Queue status:', status);

    const items = await this.redisQueueHelper.getQueueItems();
    console.log('Queue items:', items);
  }

  /**
   * 示例：模拟多个服务实例同时请求相同API
   */
  async exampleConcurrentApiRequests() {
    const apiPath = '/api/rate-limited-endpoint';
    const url = 'https://api.example.com/rate-limited-endpoint';

    // 模拟多个服务实例同时请求
    const promises = Array.from({ length: 5 }, (_, index) =>
      this.redisQueueHelper.addGetRequest(apiPath, url, {
        'Instance-ID': `service-${index + 1}`,
      }),
    );

    const requestIds = await Promise.all(promises);
    console.log('Concurrent requests added:', requestIds);

    // 等待结果
    const results = await Promise.allSettled(
      requestIds.map((id) => this.redisQueueHelper.waitForResult(id)),
    );

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Instance ${index + 1} result:`, result.value);
      } else {
        console.error(`Instance ${index + 1} failed:`, result.reason);
      }
    });
  }
}
