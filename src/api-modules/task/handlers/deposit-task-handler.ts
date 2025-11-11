import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import { BaseTaskHandler, TaskValidationResult } from './base-task-handler';
import { TransactionHistoryService } from 'src/api-modules/assets/services/transaction-history.service';
import { TransactionItype } from 'src/api-modules/assets/entities/onchain/transaction-onchain-history.entity';
import { UserService } from 'src/api-modules/user/service/user.service';

/**
 * 充值任务处理器
 */
@Injectable()
export class DepositTaskHandler extends BaseTaskHandler {
  constructor(
    private readonly transactionHistoryService: TransactionHistoryService,
    private readonly userService: UserService,
  ) {
    super();
  }

  getSupportedTypes(): TaskType[] {
    return [TaskType.DEPOSIT];
  }

  async validate(
    task: Task,
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult> {
    // 检查是否为首次充值
    if (userProgress && userProgress.completionCount > 0) {
      return {
        valid: false,
        message: 'First deposit task already completed',
        errorCode: 'ALREADY_COMPLETED',
      };
    }

    const transactions =
      await this.transactionHistoryService.getOnChainTransactionByConditions({
        itype: TransactionItype.TOKEN_TRANSFER,
      });

    const user = await this.userService.getUser(userProgress.userId);

    for (const transaction of transactions) {
      if (transaction.to.some((t) => t.address === user.evmAAWallet)) {
        return {
          valid: true,
        };
      }
    }

    return {
      valid: false,
      message: 'No deposit record found',
      errorCode: 'NO_DEPOSIT_RECORD_FOUND',
    };
  }
}
