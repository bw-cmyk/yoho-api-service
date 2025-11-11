import { Injectable } from '@nestjs/common';
import { TaskReward, RewardGrantType } from '../entities/task-reward.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';
import {
  BaseRewardHandler,
  RewardCalculationResult,
} from './base-reward-handler';

/**
 * 渐进式奖励处理器（如签到奖励）
 */
@Injectable()
export class ProgressiveRewardHandler extends BaseRewardHandler {
  getSupportedGrantTypes(): RewardGrantType[] {
    return [RewardGrantType.PROGRESSIVE];
  }

  async calculate(
    reward: TaskReward,
    userProgress?: UserTaskProgress,
  ): Promise<RewardCalculationResult> {
    const config = reward.amountConfig || {};
    const rules = config.progressiveRules || [];

    const accumulated = userProgress?.accumulatedRewardAmount || 0;

    // 找到适用的规则
    for (const rule of rules) {
      if (rule.threshold === undefined || accumulated <= rule.threshold) {
        const min = rule.minAmount || 0;
        const max = rule.maxAmount || min;

        let randomAmount = Math.random() * (max - min) + min;

        // 如果启用均值减半
        if (rule.meanHalf) {
          const meanHalf = 0.5 * (rule.threshold - accumulated);
          if (meanHalf < max) {
            randomAmount = meanHalf;
          }
        }

        return {
          amount: parseFloat(randomAmount.toFixed(8)),
          currency: reward.currency,
          targetBalance: reward.targetBalance,
          metadata: {
            ...reward.metadata,
            rule,
            accumulated,
            reductionFactor: rule.meanHalf
              ? Math.pow(0.5, Math.floor(accumulated / (rule.threshold || 1)))
              : 1,
          },
        };
      }
    }

    // 默认规则（如果没有匹配的规则）
    const min = config.min || 0;
    const max = config.max || min;
    const randomAmount = Math.random() * (max - min) + min;

    return {
      amount: parseFloat(randomAmount.toFixed(8)),
      currency: reward.currency,
      targetBalance: reward.targetBalance,
      metadata: {
        ...reward.metadata,
        accumulated,
        defaultRule: true,
      },
    };
  }
}
