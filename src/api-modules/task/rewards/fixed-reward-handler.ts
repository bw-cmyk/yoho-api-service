import { Injectable } from '@nestjs/common';
import { TaskReward, RewardGrantType } from '../entities/task-reward.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import {
  BaseRewardHandler,
  RewardCalculationResult,
} from './base-reward-handler';

/**
 * 固定金额奖励处理器
 */
@Injectable()
export class FixedRewardHandler extends BaseRewardHandler {
  getSupportedGrantTypes(): RewardGrantType[] {
    return [RewardGrantType.FIXED];
  }

  async calculate(
    reward: TaskReward,
    _userProgress?: UserTaskProgress,
    _completionData?: Record<string, any>,
  ): Promise<RewardCalculationResult> {
    return {
      amount: reward.amount || 0,
      currency: reward.currency,
      targetBalance: reward.targetBalance,
      metadata: reward.metadata,
    };
  }
}
