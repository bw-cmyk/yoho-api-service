import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';
import { TransactionHistoryService } from 'src/api-modules/assets/services/transaction-history.service';
import { AssetService } from 'src/api-modules/assets/services/asset.service';
import { UserCampaignProgress } from '../entities/user-campaign-progress.entity';

/**
 * 交易任务处理器（BTC交易、交易流水等）
 */
@Injectable()
export class TradeTaskHandler extends BaseTaskHandler {
  constructor(
    private readonly assetService: AssetService,
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {
    super();
  }

  getSupportedTypes(): TaskType[] {
    return [TaskType.TRADE_BTC, TaskType.TRADE_VOLUME];
  }

  async validate(
    task: Task,
    userProgress?: UserTaskProgress,
    campaignProgress?: UserCampaignProgress,
  ): Promise<TaskValidationResult> {
    const completionConditions = task.completionConditions;
    const gameTransactionVolume = await this.assetService.getTradingVolume(
      userProgress.userId,
    );
    const onChainTransactionVolume =
      await this.transactionHistoryService.getTradingVolume(
        userProgress.userId,
      );
    const totalTransactionVolume = gameTransactionVolume.plus(
      onChainTransactionVolume,
    );
    const firstDepositAmount = campaignProgress?.metadata?.firstDepositAmount;

    if (completionConditions.minAmount) {
      if (totalTransactionVolume.lt(completionConditions.minAmount)) {
        return {
          valid: false,
          message: 'Total transaction volume is less than required',
          errorCode: 'INSUFFICIENT_TRANSACTION_VOLUME',
        };
      }
    }
    if (completionConditions.tradeVolumeMultiple) {
      if (
        totalTransactionVolume.lt(
          firstDepositAmount.mul(completionConditions.tradeVolumeMultiple),
        )
      ) {
        return {
          valid: false,
          message: `Total transaction volume is less than required trade volume ${firstDepositAmount.mul(
            completionConditions.tradeVolumeMultiple,
          )}`,
          errorCode: 'INSUFFICIENT_TRANSACTION_VOLUME',
        };
      }
    }
    return { valid: true };
  }
}
