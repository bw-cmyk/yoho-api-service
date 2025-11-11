import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';

/**
 * 社交任务处理器（添加botim好友、关注公众号等）
 */
@Injectable()
export class SocialTaskHandler extends BaseTaskHandler {
  getSupportedTypes(): TaskType[] {
    return [TaskType.ADD_BOTIM_FRIEND, TaskType.FOLLOW_BOTIM_OFFICIAL];
  }

  async validate(
    task: Task,
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    return { valid: false };
  }
}
