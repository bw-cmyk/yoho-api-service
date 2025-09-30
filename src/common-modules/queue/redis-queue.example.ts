import { Injectable } from '@nestjs/common';
import { RedisQueueService } from './redis-queue.service';

@Injectable()
export class RedisQueueExampleService {
  constructor(private readonly redisQueueService: RedisQueueService) {
    this.initializeFunctions();
  }

  /**
   * 初始化请求函数和回调函数
   */
  private initializeFunctions(): void {
    // 注册请求函数
    this.redisQueueService.registerRequestFunction(
      'http-get-request',
      async (params: any) => {
        // 模拟 HTTP GET 请求
        const { url, headers } = params;
        console.log(`Making GET request to: ${url}`);

        // 这里应该使用实际的 HTTP 客户端
        // 为了演示，我们返回模拟数据
        return {
          status: 200,
          data: { message: 'GET request successful', url, headers },
          timestamp: Date.now(),
        };
      },
    );

    this.redisQueueService.registerRequestFunction(
      'http-post-request',
      async (params: any) => {
        // 模拟 HTTP POST 请求
        const { url, body } = params;
        console.log(`Making POST request to: ${url}`, body);

        return {
          status: 201,
          data: { message: 'POST request successful', url, body },
          timestamp: Date.now(),
        };
      },
    );

    // 注册回调函数
    this.redisQueueService.registerCallbackFunction(
      'success-callback',
      (result: any, error?: any) => {
        if (error) {
          console.error('Request failed:', error);
        } else {
          console.log('Request successful:', result);
        }
      },
    );

    this.redisQueueService.registerCallbackFunction(
      'error-callback',
      (result: any, error?: any) => {
        console.error('Error callback triggered:', error);
        // 可以在这里实现错误处理逻辑，比如发送通知、记录日志等
      },
    );
  }

  /**
   * 添加 GET 请求到队列
   */
  async addGetRequest(
    apiPath: string,
    url: string,
    headers?: Record<string, string>,
  ): Promise<string> {
    return this.redisQueueService.addToQueue(
      apiPath,
      'GET',
      url,
      'http-get-request', // requestFunctionId
      'success-callback', // callbackFunctionId
      headers,
      undefined, // body
      0, // priority
    );
  }

  /**
   * 添加 POST 请求到队列
   */
  async addPostRequest(
    apiPath: string,
    url: string,
    body: any,
    headers?: Record<string, string>,
  ): Promise<string> {
    return this.redisQueueService.addToQueue(
      apiPath,
      'POST',
      url,
      'http-post-request', // requestFunctionId
      'success-callback', // callbackFunctionId
      headers,
      body,
      0, // priority
    );
  }

  /**
   * 添加高优先级请求
   */
  async addHighPriorityRequest(
    apiPath: string,
    url: string,
    headers?: Record<string, string>,
  ): Promise<string> {
    return this.redisQueueService.addToQueue(
      apiPath,
      'GET',
      url,
      'http-get-request',
      'success-callback',
      headers,
      undefined,
      10, // 高优先级
    );
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    return this.redisQueueService.getQueueStatus();
  }

  /**
   * 获取队列中的所有项目
   */
  async getQueueItems() {
    return this.redisQueueService.getQueueItems();
  }

  /**
   * 获取已注册的函数ID
   */
  getRegisteredFunctions() {
    return {
      requestFunctions:
        this.redisQueueService.getRegisteredRequestFunctionIds(),
      callbackFunctions:
        this.redisQueueService.getRegisteredCallbackFunctionIds(),
    };
  }
}
