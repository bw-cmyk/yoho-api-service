import { Injectable } from '@nestjs/common';
import { QueueHelperService } from './queue-helper.service';

@Injectable()
export class QueueExampleService {
  constructor(private readonly queueHelper: QueueHelperService) {}

  /**
   * 示例：添加单个API请求到队列
   */
  async exampleSingleRequest() {
    // 模拟API调用
    const apiCall = async () => {
      console.log('Making API call...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return { data: 'API response', timestamp: Date.now() };
    };

    const requestId = await this.queueHelper.addApiRequest(
      apiCall,
      (result) => {
        console.log('API call successful:', result);
      },
      (error) => {
        console.error('API call failed:', error);
      },
      1, // 优先级
    );

    console.log('Request added to queue with ID:', requestId);
  }

  /**
   * 示例：批量添加API请求
   */
  async exampleBatchRequests() {
    const apiCalls = [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return { id: 1, data: 'Response 1' };
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return { id: 2, data: 'Response 2' };
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 700));
        return { id: 3, data: 'Response 3' };
      },
    ];

    const requestIds = await this.queueHelper.addBatchApiRequests(
      apiCalls,
      (results) => {
        console.log('All batch requests completed:', results);
      },
      (errors) => {
        console.error('Some batch requests failed:', errors);
      },
    );

    console.log('Batch requests added to queue with IDs:', requestIds);
  }

  /**
   * 示例：添加延迟请求
   */
  async exampleDelayedRequest() {
    const apiCall = async () => {
      console.log('Making delayed API call...');
      return { data: 'Delayed response', timestamp: Date.now() };
    };

    const requestId = await this.queueHelper.addDelayedRequest(
      apiCall,
      5000, // 5秒延迟
      (result) => {
        console.log('Delayed API call successful:', result);
      },
      (error) => {
        console.error('Delayed API call failed:', error);
      },
    );

    console.log('Delayed request added to queue with ID:', requestId);
  }

  /**
   * 示例：添加重试请求
   */
  async exampleRetryRequest() {
    let attemptCount = 0;

    const apiCall = async () => {
      attemptCount++;
      console.log(`API call attempt ${attemptCount}`);

      if (attemptCount < 3) {
        throw new Error(`Simulated failure on attempt ${attemptCount}`);
      }

      return { data: 'Success after retries', attempts: attemptCount };
    };

    const requestId = await this.queueHelper.addRetryRequest(
      apiCall,
      2, // 最大重试次数
      1000, // 重试延迟（毫秒）
      (result) => {
        console.log('Retry request successful:', result);
      },
      (error) => {
        console.error('Retry request failed after all attempts:', error);
      },
    );

    console.log('Retry request added to queue with ID:', requestId);
  }

  /**
   * 示例：模拟外部API调用
   */
  async exampleExternalApiCall() {
    // 模拟调用外部API（例如：发送邮件、调用第三方服务等）
    const sendEmail = async (to: string, subject: string, content: string) => {
      console.log(`Sending email to ${to}: ${subject}`);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 模拟偶尔失败
      if (Math.random() < 0.3) {
        throw new Error('Email service temporarily unavailable');
      }

      return { messageId: `msg_${Date.now()}`, status: 'sent' };
    };

    const requestId = await this.queueHelper.addApiRequest(
      () => sendEmail('user@example.com', 'Test Subject', 'Test content'),
      (result) => {
        console.log('Email sent successfully:', result);
      },
      (error) => {
        console.error('Email sending failed:', error);
      },
      2, // 高优先级
    );

    console.log('Email request added to queue with ID:', requestId);
  }
}
