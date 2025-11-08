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
    completionData: Record<string, any>,
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 检查是否已经完成过（一次性任务）
    if (userProgress && userProgress.completionCount > 0) {
      return {
        valid: false,
        message: 'Social task already completed',
        errorCode: 'ALREADY_COMPLETED',
      };
    }

    // 基础条件验证（目标ID等）
    const baseResult = this.validateBaseConditions(task, completionData);
    if (!baseResult.valid) {
      return baseResult;
    }

    // 检查目标ID是否匹配
    const conditions = task.completionConditions || {};
    if (
      conditions.targetId &&
      completionData.targetId !== conditions.targetId
    ) {
      return {
        valid: false,
        message: `Target ID mismatch, expected ${conditions.targetId}`,
        errorCode: 'TARGET_ID_MISMATCH',
      };
    }

    return { valid: true };
  }
}
