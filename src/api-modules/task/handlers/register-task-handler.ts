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
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    return { valid: true };
  }
}
