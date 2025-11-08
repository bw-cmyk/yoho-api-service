import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';

/**
 * 注册任务处理器
 */
@Injectable()
export class RegisterTaskHandler extends BaseTaskHandler {
  getSupportedTypes(): TaskType[] {
    return [TaskType.REGISTER];
  }

  async validate(
    task: Task,
    _completionData: Record<string, any>,
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 注册任务只需要检查是否已经完成过（一次性任务）
    if (userProgress && userProgress.completionCount > 0) {
      return {
        valid: false,
        message: 'Registration task already completed',
        errorCode: 'ALREADY_COMPLETED',
      };
    }

    // 基础条件验证
    return this.validateBaseConditions(task, _completionData);
  }
}
