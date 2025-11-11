import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';

/**
 * 默认任务处理器（处理自定义任务或其他未定义的任务类型）
 */
@Injectable()
export class DefaultTaskHandler extends BaseTaskHandler {
  getSupportedTypes(): TaskType[] {
    return [TaskType.CUSTOM];
  }

  async validate(
    task: Task,
    _userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 默认处理器只做基础验证
    return { valid: true };
  }
}
