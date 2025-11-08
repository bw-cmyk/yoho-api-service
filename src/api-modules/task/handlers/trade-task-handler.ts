import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';

/**
 * 交易任务处理器（BTC交易、交易流水等）
 */
@Injectable()
export class TradeTaskHandler extends BaseTaskHandler {
  getSupportedTypes(): TaskType[] {
    return [TaskType.TRADE_BTC, TaskType.TRADE_VOLUME];
  }

  async validate(
    task: Task,
    completionData: Record<string, any>,
    _userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 基础条件验证（金额、币种等）
    const baseResult = this.validateBaseConditions(task, completionData);
    if (!baseResult.valid) {
      return baseResult;
    }

    // 检查交易类型
    if (task.type === TaskType.TRADE_BTC) {
      if (
        completionData.coinType !== 'BTC' &&
        completionData.coinType !== 'BTCUSDT'
      ) {
        return {
          valid: false,
          message: 'Only BTC trading is allowed',
          errorCode: 'INVALID_COIN_TYPE',
        };
      }
    }

    // 检查是否有有效的交易记录
    if (!completionData.referenceId && !completionData.transactionId) {
      return {
        valid: false,
        message: 'Missing trade reference',
        errorCode: 'MISSING_REFERENCE',
      };
    }

    return { valid: true };
  }
}
