import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Decimal } from 'decimal.js';
import {
  UserTaskReward,
  UserTaskRewardStatus,
} from '../entities/user-task-reward.entity';
import { RewardType } from '../entities/task-reward.entity';

@Injectable()
export class UserTaskRewardService {
  private readonly logger = new Logger(UserTaskRewardService.name);

  constructor(
    @InjectRepository(UserTaskReward)
    private userTaskRewardRepository: Repository<UserTaskReward>,
    private dataSource: DataSource,
  ) {}

  /**
   * 获取或创建用户任务奖励记录
   */
  async getOrCreateUserTaskReward(
    userId: string,
    rewardType: RewardType,
    currency = 'USD',
  ): Promise<UserTaskReward> {
    let userReward = await this.userTaskRewardRepository.findOne({
      where: { userId, rewardType },
    });

    if (!userReward) {
      userReward = this.userTaskRewardRepository.create({
        userId,
        rewardType,
        currency,
        totalReward: 0,
        availableReward: 0,
        claimedReward: 0,
        frozenReward: 0,
        status: UserTaskRewardStatus.ACTIVE,
      });
      await this.userTaskRewardRepository.save(userReward);
    }

    return userReward;
  }

  /**
   * 增加任务奖励（完成任务时调用）
   * @param userId 用户ID
   * @param rewardType 奖励类型
   * @param amount 奖励金额
   * @param currency 货币类型
   * @param manager 可选的事务管理器，如果提供则在同一事务中执行
   */
  async addReward(
    userId: string,
    taskId: number,
    rewardType: RewardType,
    amount: number,
    currency = 'USD',
    manager?: EntityManager,
  ): Promise<UserTaskReward> {
    const execute = async (mgr: EntityManager) => {
      const userReward = await mgr.findOne(UserTaskReward, {
        where: { userId, rewardType },
        lock: { mode: 'pessimistic_write' },
      });

      if (!userReward) {
        // 如果不存在，创建新记录
        const newReward = mgr.create(UserTaskReward, {
          userId,
          taskId,
          rewardType,
          currency,
          totalReward: amount,
          availableReward: amount,
          claimedReward: 0,
          frozenReward: 0,
          status: UserTaskRewardStatus.ACTIVE,
          lastRewardAt: new Date(),
        });
        return await mgr.save(newReward);
      }

      // 更新奖励金额
      userReward.totalReward = new Decimal(userReward.totalReward)
        .plus(amount)
        .toNumber();
      userReward.availableReward = new Decimal(userReward.availableReward)
        .plus(amount)
        .toNumber();
      userReward.lastRewardAt = new Date();

      return await mgr.save(userReward);
    };

    if (manager) {
      // 如果提供了事务管理器，在同一事务中执行
      return await execute(manager);
    } else {
      // 否则创建新事务
      return await this.dataSource.transaction(execute);
    }
  }

  /**
   * 领取奖励
   */
  async claimReward(
    userId: string,
    rewardType: RewardType,
    amount: number,
  ): Promise<UserTaskReward> {
    return await this.dataSource.transaction(async (manager) => {
      const userReward = await manager.findOne(UserTaskReward, {
        where: { userId, rewardType },
        lock: { mode: 'pessimistic_write' },
      });

      if (!userReward) {
        throw new Error(`User task reward not found for user ${userId}`);
      }

      if (userReward.availableReward < amount) {
        throw new Error(
          `Insufficient available reward. Available: ${userReward.availableReward}, Requested: ${amount}`,
        );
      }

      // 更新奖励金额
      userReward.availableReward = new Decimal(userReward.availableReward)
        .minus(amount)
        .toNumber();
      userReward.claimedReward = new Decimal(userReward.claimedReward)
        .plus(amount)
        .toNumber();
      userReward.lastClaimAt = new Date();

      return await manager.save(userReward);
    });
  }

  /**
   * 冻结奖励
   */
  async freezeReward(
    userId: string,
    rewardType: RewardType,
    amount: number,
  ): Promise<UserTaskReward> {
    return await this.dataSource.transaction(async (manager) => {
      const userReward = await manager.findOne(UserTaskReward, {
        where: { userId, rewardType },
        lock: { mode: 'pessimistic_write' },
      });

      if (!userReward) {
        throw new Error(`User task reward not found for user ${userId}`);
      }

      if (userReward.availableReward < amount) {
        throw new Error(
          `Insufficient available reward. Available: ${userReward.availableReward}, Requested: ${amount}`,
        );
      }

      // 从可用奖励转移到冻结奖励
      userReward.availableReward = new Decimal(userReward.availableReward)
        .minus(amount)
        .toNumber();
      userReward.frozenReward = new Decimal(userReward.frozenReward)
        .plus(amount)
        .toNumber();

      return await manager.save(userReward);
    });
  }

  /**
   * 解冻奖励
   */
  async unfreezeReward(
    userId: string,
    rewardType: RewardType,
    amount: number,
  ): Promise<UserTaskReward> {
    return await this.dataSource.transaction(async (manager) => {
      const userReward = await manager.findOne(UserTaskReward, {
        where: { userId, rewardType },
        lock: { mode: 'pessimistic_write' },
      });

      if (!userReward) {
        throw new Error(`User task reward not found for user ${userId}`);
      }

      if (userReward.frozenReward < amount) {
        throw new Error(
          `Insufficient frozen reward. Frozen: ${userReward.frozenReward}, Requested: ${amount}`,
        );
      }

      // 从冻结奖励转移到可用奖励
      userReward.frozenReward = new Decimal(userReward.frozenReward)
        .minus(amount)
        .toNumber();
      userReward.availableReward = new Decimal(userReward.availableReward)
        .plus(amount)
        .toNumber();

      return await manager.save(userReward);
    });
  }

  /**
   * 获取用户任务奖励
   */
  async getUserTaskReward(
    userId: string,
    rewardType: RewardType,
  ): Promise<UserTaskReward | null> {
    return await this.userTaskRewardRepository.findOne({
      where: { userId, rewardType },
    });
  }

  /**
   * 获取用户的所有任务奖励（按类型）
   */
  async getUserTaskRewards(userId: string): Promise<UserTaskReward[]> {
    return await this.userTaskRewardRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取用户任务奖励（如果不存在则创建）
   */
  async getUserTaskRewardOrCreate(
    userId: string,
    rewardType: RewardType,
    currency = 'USD',
  ): Promise<UserTaskReward> {
    return await this.getOrCreateUserTaskReward(userId, rewardType, currency);
  }
}
