import { Injectable } from '@nestjs/common';
import { RewardGrantType } from '../entities/task-reward.entity';
import { BaseRewardHandler } from './base-reward-handler';
import { FixedRewardHandler } from './fixed-reward-handler';
import { RandomRewardHandler } from './random-reward-handler';
import { ProgressiveRewardHandler } from './progressive-reward-handler';

/**
 * 奖励处理器工厂
 */
@Injectable()
export class RewardHandlerFactory {
  private handlers: BaseRewardHandler[];

  constructor(
    private fixedHandler: FixedRewardHandler,
    private randomHandler: RandomRewardHandler,
    private progressiveHandler: ProgressiveRewardHandler,
  ) {
    // 注册所有奖励处理器
    this.handlers = [fixedHandler, randomHandler, progressiveHandler];
  }

  /**
   * 根据奖励发放类型获取对应的处理器
   */
  getHandler(grantType: RewardGrantType): BaseRewardHandler {
    const handler = this.handlers.find((h) => h.supports(grantType));
    if (!handler) {
      // 如果没有找到，返回固定金额处理器作为默认
      return this.fixedHandler;
    }
    return handler;
  }

  /**
   * 注册自定义奖励处理器
   */
  registerCustomHandler(handler: BaseRewardHandler, _priority = 0): void {
    // 可以在这里实现动态注册处理器的逻辑
    // 目前先使用静态注册方式
  }
}
