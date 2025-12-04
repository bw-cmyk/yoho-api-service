import { Injectable } from '@nestjs/common';
import { TaskReward, RewardGrantType } from '../entities/task-reward.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import {
  BaseRewardHandler,
  RewardCalculationContext,
  RewardCalculationResult,
} from './base-reward-handler';
import { AssetService } from 'src/api-modules/assets/services/asset.service';
import { Currency } from 'src/api-modules/assets/entities/balance/user-asset.entity';
import Decimal from 'decimal.js';

/**
 * 随机金额奖励处理器
 */
@Injectable()
export class PercentageRewardHandler extends BaseRewardHandler {
  constructor(private readonly assetService: AssetService) {
    super();
  }
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

  async grantReward(
    reward: TaskReward,
    userProgress?: UserTaskProgress,
    context?: RewardCalculationContext,
  ): Promise<void> {
    const campaign = context?.campaign;
    const { amount } = await this.calculate(reward, userProgress, context);

    await this.assetService.bonusGrant({
      userId: userProgress.userId,
      currency: Currency.USD,
      amount: new Decimal(amount || 0),
      game_id: 'CAMPAIGN_REWARD',
      description: `Campaign reward: ${campaign?.name}`,
      metadata: {
        campaignId: campaign?.id,
        ...reward,
      },
    });
  }
}
