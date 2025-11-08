import { Injectable } from '@nestjs/common';
import { TaskReward, RewardGrantType } from '../entities/task-reward.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import {
  BaseRewardHandler,
  RewardCalculationResult,
} from './base-reward-handler';

/**
 * 随机金额奖励处理器
 */
@Injectable()
export class RandomRewardHandler extends BaseRewardHandler {
  getSupportedGrantTypes(): RewardGrantType[] {
    return [RewardGrantType.RANDOM];
  }

  async calculate(
    reward: TaskReward,
    _userProgress?: UserTaskProgress,
    _completionData?: Record<string, any>,
  ): Promise<RewardCalculationResult> {
    const config = reward.amountConfig || {};
    const min = config.min || 0;
    const max = config.max || min;

    // 生成随机金额
    const randomAmount = Math.random() * (max - min) + min;

    return {
      amount: parseFloat(randomAmount.toFixed(8)),
      currency: reward.currency,
      targetBalance: reward.targetBalance,
      metadata: {
        ...reward.metadata,
        min,
        max,
        randomAmount,
      },
    };
  }
}
