import { Injectable, Logger } from '@nestjs/common';
import { OKXDEX, OKXRequestOptions } from './okx';
import { RedisQueueService } from 'src/common-modules/queue/redis-queue.service';
import {
  OKX_REQUEST_FUNCTION_ID,
  OKX_TRENDING_CALLBACK_FUNCTION_ID,
} from '../constants';

export interface OKXQueueRequestOptions extends OKXRequestOptions {
  priority?: number;
}

@Injectable()
export class OKXQueueService {
  private readonly logger = new Logger(OKXQueueService.name);

  constructor(
    private readonly okxDex: OKXDEX,
    private readonly queueService: RedisQueueService,
  ) {
    this.initializeFunctions();
  }

  /**
   * 初始化请求函数和回调函数
   */
  private initializeFunctions(): void {
    // 注册 OKX 请求函数
    this.queueService.registerRequestFunction(
      OKX_REQUEST_FUNCTION_ID,
      async (params: any) => {
        const { method, url, headers, body, queryParams } = params;

        this.logger.debug(`Executing OKX request: ${method} ${url}`);

        try {
          // 解析 URL 获取路径
          const urlObj = new URL(url);

          // 构建 OKX 请求选项
          const okxOptions: OKXRequestOptions = {
            method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
            path: urlObj.pathname,
            data: body,
            queryParams: queryParams || this.parseQueryParams(urlObj.search),
            headers,
          };

          // 执行 OKX 请求
          const result = await this.okxDex.request(okxOptions);

          this.logger.debug(`OKX request completed: ${method} ${url}`);
          return result;
        } catch (error) {
          this.logger.error(`OKX request failed: ${method} ${url}`, error);
          throw error;
        }
      },
    );

    // 注册 OKX 回调函数
    // this.queueService.registerCallbackFunction(
    //   OKX_TRENDING_CALLBACK_FUNCTION_ID,
    //   (result: any, requestParams: any) => {
    //     this.logger.debug('OKX trending callback executed', {
    //       result: result ? 'success' : 'failed',
    //       requestParams,
    //     });

    //     // 这里可以添加额外的回调处理逻辑
    //     // 比如更新缓存、发送通知等
    //   },
    // );
  }

  /**
   * 解析查询参数
   */
  private parseQueryParams(search: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (search) {
      const urlParams = new URLSearchParams(search);
      urlParams.forEach((value, key) => {
        params[key] = value;
      });
    }
    return params;
  }

  /**
   * 添加 OKX 请求到队列
   */
  private async addToQueue(
    method: string,
    path: string,
    data?: any,
    queryParams?: Record<string, string>,
    headers?: Record<string, string>,
    priority = 0,
  ): Promise<string> {
    const baseUrl = this.okxDex.getConfig().baseUrl;
    const fullUrl = `${baseUrl}${path}`;

    // 构建 API 路径用于去重
    const apiPath = `${method}:${path}`;

    return this.queueService.addToQueue(
      apiPath,
      method,
      fullUrl,
      OKX_REQUEST_FUNCTION_ID,
      OKX_TRENDING_CALLBACK_FUNCTION_ID,
      headers,
      data,
      queryParams,
      priority,
    );
  }

  /**
   * 队列化的 GET 请求
   */
  public async get(
    path: string,
    queryParams?: Record<string, string>,
    priority = 0,
  ): Promise<string> {
    this.logger.debug(`Queuing GET request: ${path}`);
    return this.addToQueue(
      'GET',
      path,
      undefined,
      queryParams,
      undefined,
      priority,
    );
  }

  /**
   * 队列化的 POST 请求
   */
  public async post(path: string, data?: any, priority = 0): Promise<string> {
    this.logger.debug(`Queuing POST request: ${path}`);
    return this.addToQueue('POST', path, data, undefined, undefined, priority);
  }

  /**
   * 队列化的 PUT 请求
   */
  public async put(path: string, data?: any, priority = 0): Promise<string> {
    this.logger.debug(`Queuing PUT request: ${path}`);
    return this.addToQueue('PUT', path, data, undefined, undefined, priority);
  }

  /**
   * 队列化的 DELETE 请求
   */
  public async delete(path: string, data?: any, priority = 0): Promise<string> {
    this.logger.debug(`Queuing DELETE request: ${path}`);
    return this.addToQueue(
      'DELETE',
      path,
      data,
      undefined,
      undefined,
      priority,
    );
  }

  /**
   * 队列化的通用请求方法
   */
  public async request(options: OKXQueueRequestOptions): Promise<string> {
    const { method, path, data, queryParams, headers, priority = 0 } = options;

    this.logger.debug(`Queuing ${method} request: ${path}`);
    return this.addToQueue(method, path, data, queryParams, headers, priority);
  }

  /**
   * 队列化的获取历史K线数据
   */
  public async getHistoricalCandles(
    params: {
      chainIndex: string;
      tokenContractAddress: string;
      after?: string;
      before?: string;
      bar?: string;
      limit?: string;
    },
    priority = 0,
  ): Promise<string> {
    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
      tokenContractAddress: params.tokenContractAddress,
    };

    // 添加可选参数
    if (params.after) queryParams.after = params.after;
    if (params.before) queryParams.before = params.before;
    if (params.bar) queryParams.bar = params.bar;
    if (params.limit) queryParams.limit = params.limit;

    return this.get(
      '/api/v5/dex/market/historical-candles',
      queryParams,
      priority,
    );
  }

  /**
   * 队列化的获取支持的链信息
   */
  public async getSupportedChains(
    params: { chainIndex?: string } = {},
    priority = 0,
  ): Promise<string> {
    const queryParams: Record<string, string> = {};
    if (params.chainIndex) {
      queryParams.chainIndex = params.chainIndex;
    }

    return this.get(
      '/api/v6/dex/aggregator/supported/chain',
      queryParams,
      priority,
    );
  }

  /**
   * 队列化的获取币种列表
   */
  public async getAllTokens(
    params: { chainIndex: string },
    priority = 0,
  ): Promise<string> {
    const queryParams: Record<string, string> = {
      chainIndex: params.chainIndex,
    };

    return this.get('/api/v6/dex/aggregator/all-tokens', queryParams, priority);
  }

  /**
   * 获取队列状态
   */
  async getQueueStatus() {
    return this.queueService.getQueueStatus();
  }

  /**
   * 获取队列中的所有项目
   */
  async getQueueItems() {
    return this.queueService.getQueueItems();
  }

  /**
   * 清空队列
   */
  async clearQueue() {
    return this.queueService.clearQueue();
  }

  /**
   * 获取已注册的函数ID
   */
  getRegisteredFunctions() {
    return {
      requestFunctions: this.queueService.getRegisteredRequestFunctionIds(),
      callbackFunctions: this.queueService.getRegisteredCallbackFunctionIds(),
    };
  }
}
