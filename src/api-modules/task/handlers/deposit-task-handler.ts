import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';

/**
 * 充值任务处理器
 */
@Injectable()
export class DepositTaskHandler extends BaseTaskHandler {
  getSupportedTypes(): TaskType[] {
    return [TaskType.DEPOSIT];
  }

  async validate(
    task: Task,
    completionData: Record<string, any>,
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 检查是否为首次充值
    if (userProgress && userProgress.completionCount > 0) {
      return {
        valid: false,
        message: 'First deposit task already completed',
        errorCode: 'ALREADY_COMPLETED',
      };
    }

    // 检查充值金额
    const baseResult = this.validateBaseConditions(task, completionData);
    if (!baseResult.valid) {
      return baseResult;
    }

    // 检查是否有有效的充值记录
    if (!completionData.referenceId && !completionData.transactionId) {
      return {
        valid: false,
        message: 'Missing deposit reference',
        errorCode: 'MISSING_REFERENCE',
      };
    }

    return { valid: true };
  }
}
