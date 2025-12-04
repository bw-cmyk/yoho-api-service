import { Campaign } from '../entities/campaign.entity';
import { TaskReward, RewardGrantType } from '../entities/task-reward.entity';
import { UserCampaignProgress } from '../entities/user-campaign-progress.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';

/**
 * 奖励计算结果
 */
export interface RewardCalculationResult {
  amount: number;
  currency?: string;
  targetBalance?: string;
  metadata?: Record<string, any>;
}

export interface RewardCalculationContext {
  campaign?: Campaign;
  campaignProgress?: UserCampaignProgress;
}
/**
 * 奖励处理器抽象基类
 */
export abstract class BaseRewardHandler {
  /**
   * 获取支持的奖励发放类型
   */
  abstract getSupportedGrantTypes(): RewardGrantType[];

  /**
   * 计算奖励金额
   * @param reward 奖励配置
   * @param userProgress 用户任务进度
   * @param completionData 完成数据（可选，某些奖励类型可能需要）
   * @returns 奖励计算结果
   */
  abstract calculate(
    reward: TaskReward,
    userProgress?: UserTaskProgress,
    context?: RewardCalculationContext,
  ): Promise<RewardCalculationResult>;

  /**
   * 检查奖励类型是否支持
   */
  supports(grantType: RewardGrantType): boolean {
    return this.getSupportedGrantTypes().includes(grantType);
  }

  /**
   * 发放奖励
   * @param reward 奖励配置
   * @param userProgress 用户任务进度
   * @param context 计算上下文
   * @returns 奖励发放结果
   */
  grantReward(
    reward: TaskReward,
    userProgress?: UserTaskProgress,
    context?: RewardCalculationContext,
  ): Promise<void> {
    return Promise.resolve();
  }
}
