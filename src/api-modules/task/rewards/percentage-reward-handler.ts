import { Injectable } from '@nestjs/common';
import { TaskReward, RewardGrantType } from '../entities/task-reward.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import {
  BaseRewardHandler,
  RewardCalculationContext,
  RewardCalculationResult,
} from './base-reward-handler';

/**
 * 随机金额奖励处理器
 */
@Injectable()
export class PercentageRewardHandler extends BaseRewardHandler {
  getSupportedGrantTypes(): RewardGrantType[] {
    return [RewardGrantType.FIRST_DEPOSIT];
  }

  async calculate(
    reward: TaskReward,
    _userProgress?: UserTaskProgress,
    context?: RewardCalculationContext,
  ): Promise<RewardCalculationResult> {
    const config = reward.amountConfig || {};
    const percentage = config.percentage || 0;
    const campaignProgress = context?.campaignProgress;

    if (campaignProgress?.metadata) {
      const { rewardAmount } = campaignProgress.metadata;
      return {
        amount: rewardAmount * percentage,
        currency: reward.currency,
        targetBalance: reward.targetBalance,
        metadata: {
          ...reward.metadata,
          rewardAmount,
        },
      };
    }

    return {
      amount: 0,
      currency: reward.currency,
    };
  }

  // async grantReward(
  //   reward: TaskReward,
  //   userProgress?: UserTaskProgress,
  //   context?: RewardCalculationContext,
  // ): Promise<void> {
  //   await this.assetService.deposit({
  //     userId: userProgress.userId,
  //     currency: reward.currency,
  //     amount: amount,
  //     description: `Campaign reward: ${campaign.name}`,
  //     metadata: {
  //       campaignId: campaign.id,
  //     },
  //   });
  // }
}
