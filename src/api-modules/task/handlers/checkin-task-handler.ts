import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';

/**
 * 签到任务处理器
 */
@Injectable()
export class CheckInTaskHandler extends BaseTaskHandler {
  getSupportedTypes(): TaskType[] {
    return [TaskType.CHECK_IN];
  }

  async validate(
    _task: Task,
    _userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 签到任务不需要特殊验证，只需要检查是否在有效时间范围内
    return { valid: true };
  }
}
