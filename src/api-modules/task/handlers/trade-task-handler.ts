import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';
import { TransactionHistoryService } from 'src/api-modules/assets/services/transaction-history.service';

/**
 * 交易任务处理器（BTC交易、交易流水等）
 */
@Injectable()
export class TradeTaskHandler extends BaseTaskHandler {
  constructor(
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {
    super();
  }

  getSupportedTypes(): TaskType[] {
    return [TaskType.TRADE_BTC, TaskType.TRADE_VOLUME];
  }

  async validate(
    task: Task,
    _userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    return { valid: false };
  }
}
