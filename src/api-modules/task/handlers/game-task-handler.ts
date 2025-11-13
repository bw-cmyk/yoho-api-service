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
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    if (task.type === TaskType.PLAY_PREDICTION) {
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
    }
    if (task.type === TaskType.GAME_VOLUME) {
      const completionConditions = task.completionConditions;
      const gameTransactionVolume = await this.assetService.getTradingVolume(
        userProgress.userId,
      );
      if (gameTransactionVolume.lt(completionConditions.minAmount)) {
        return {
          valid: false,
          message: 'Game transaction volume is less than required',
          errorCode: 'INSUFFICIENT_GAME_TRANSACTION_VOLUME',
        };
      }
    }
    return { valid: true };
  }
}
