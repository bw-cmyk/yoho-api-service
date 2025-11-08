import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';

/**
 * 游戏任务处理器（猜涨跌游戏、游戏流水等）
 */
@Injectable()
export class GameTaskHandler extends BaseTaskHandler {
  getSupportedTypes(): TaskType[] {
    return [TaskType.PLAY_PREDICTION, TaskType.GAME_VOLUME];
  }

  async validate(
    task: Task,
    completionData: Record<string, any>,
    _userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 基础条件验证（金额等）
    const baseResult = this.validateBaseConditions(task, completionData);
    if (!baseResult.valid) {
      return baseResult;
    }

    // 检查游戏类型
    if (task.type === TaskType.PLAY_PREDICTION) {
      if (completionData.gameType && completionData.gameType !== 'PREDICTION') {
        return {
          valid: false,
          message: 'Only prediction game is allowed',
          errorCode: 'INVALID_GAME_TYPE',
        };
      }
    }

    // 检查是否有有效的游戏记录
    if (!completionData.referenceId && !completionData.gameId) {
      return {
        valid: false,
        message: 'Missing game reference',
        errorCode: 'MISSING_REFERENCE',
      };
    }

    return { valid: true };
  }
}
