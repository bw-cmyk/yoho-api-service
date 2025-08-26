import { Injectable } from '@nestjs/common';
import { QueueService } from './queue.service';

@Injectable()
export class QueueHelperService {
  constructor(private readonly queueService: QueueService) {}

  /**
   * 添加API请求到队列
   */
  async addApiRequest<T>(
    apiCall: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: any) => void,
    priority = 0,
  ): Promise<string> {
    return this.queueService.addToQueue(
      apiCall,
      (result, error) => {
        if (error) {
          onError?.(error);
        } else {
          onSuccess?.(result);
        }
      },
      priority,
    );
  }

  /**
   * 批量添加API请求
   */
  async addBatchApiRequests<T>(
    apiCalls: Array<() => Promise<T>>,
    onSuccess?: (results: T[]) => void,
    onError?: (errors: any[]) => void,
    priority = 0,
  ): Promise<string[]> {
    const results: T[] = [];
    const errors: any[] = [];
    let completedCount = 0;

    const promises = apiCalls.map((apiCall, index) =>
      this.addApiRequest(
        apiCall,
        (result) => {
          results[index] = result;
          completedCount++;
          if (completedCount === apiCalls.length) {
            onSuccess?.(results);
          }
        },
        (error) => {
          errors[index] = error;
          completedCount++;
          if (completedCount === apiCalls.length) {
            onError?.(errors);
          }
        },
        priority,
      ),
    );

    return Promise.all(promises);
  }

  /**
   * 添加延迟请求
   */
  async addDelayedRequest<T>(
    apiCall: () => Promise<T>,
    delayMs: number,
    onSuccess?: (result: T) => void,
    onError?: (error: any) => void,
    priority = 0,
  ): Promise<string> {
    const delayedCall = () =>
      new Promise<T>((resolve, reject) => {
        setTimeout(async () => {
          try {
            const result = await apiCall();
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, delayMs);
      });

    return this.addApiRequest(delayedCall, onSuccess, onError, priority);
  }

  /**
   * 添加重试请求
   */
  async addRetryRequest<T>(
    apiCall: () => Promise<T>,
    maxRetries: number,
    retryDelay: number,
    onSuccess?: (result: T) => void,
    onError?: (error: any) => void,
    priority = 0,
  ): Promise<string> {
    const retryCall = async (): Promise<T> => {
      let lastError: any;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await apiCall();
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      throw lastError;
    };

    return this.addApiRequest(retryCall, onSuccess, onError, priority);
  }
}
