import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';
import { AssetService } from 'src/api-modules/assets/services/asset.service';

/**
 * 游戏任务处理器（猜涨跌游戏、游戏流水等）
 */
@Injectable()
export class GameTaskHandler extends BaseTaskHandler {
  constructor(private readonly assetService: AssetService) {
    super();
  }

  getSupportedTypes(): TaskType[] {
    return [TaskType.PLAY_PREDICTION, TaskType.GAME_VOLUME];
  }

  async validate(
    task: Task,
    _userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    const transactions =
      await this.assetService.getTransactionHistoryByConditions({
        referenceId: 'BTC_PREDICTION',
      });

    if (transactions.length === 0) {
      return {
        valid: false,
        message: 'No game record found',
        errorCode: 'NO_GAME_RECORD_FOUND',
      };
    }
    return { valid: true };
  }
}
