import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, MoreThanOrEqual } from 'typeorm';
import { Decimal } from 'decimal.js';
import { Task, TaskRepeatType } from '../entities/task.entity';
import { RewardType, TaskReward } from '../entities/task-reward.entity';
import {
  UserTaskProgress,
  UserTaskStatus,
} from '../entities/user-task-progress.entity';
import { TaskCompletion } from '../entities/task-completion.entity';
import { CampaignService } from './campaign.service';
import { TaskHandlerFactory } from '../handlers/task-handler-factory';
import { RewardHandlerFactory } from '../rewards/reward-handler-factory';
import { UserTaskRewardService } from './user-task-reward.service';

@Injectable()
export class TaskCompletionService {
  private readonly logger = new Logger(TaskCompletionService.name);

  constructor(
    @InjectRepository(UserTaskProgress)
    private userTaskProgressRepository: Repository<UserTaskProgress>,

    @InjectRepository(TaskCompletion)
    private taskCompletionRepository: Repository<TaskCompletion>,

    private campaignService: CampaignService,
    private taskHandlerFactory: TaskHandlerFactory,
    private rewardHandlerFactory: RewardHandlerFactory,
    private userTaskRewardService: UserTaskRewardService,
    private dataSource: DataSource,
  ) {}

  /**
   * 完成任务
   */
  async completeTask(
    userId: string,
    taskId: number,
    completionData?: Record<string, any>,
    referenceId?: string,
  ): Promise<{ progress: UserTaskProgress; rewardAmount: number }> {
    return await this.dataSource.transaction(async (manager) => {
      // 获取任务信息
      const task = await manager.findOne(Task, {
        where: { id: taskId },
      });

      if (!task) {
        throw new NotFoundException(`Task with id ${taskId} not found`);
      }

      // 获取任务奖励
      const rewards = await manager.find(TaskReward, {
        where: { taskId },
      });

      // 检查任务状态
      if (task.status !== 'ACTIVE') {
        throw new BadRequestException('Task is not active');
      }

      // 检查截止时间
      if (task.deadline && new Date() > task.deadline) {
        throw new BadRequestException('Task deadline has passed');
      }

      const campaignId = task.campaignId;

      // 确保用户已参与活动
      await this.campaignService.participateCampaign(userId, campaignId);

      // 获取或创建用户任务进度
      let progress = await manager.findOne(UserTaskProgress, {
        where: { userId, taskId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!progress) {
        progress = manager.create(UserTaskProgress, {
          userId,
          taskId,
          campaignId,
          status: UserTaskStatus.PENDING,
          completionCount: 0,
          accumulatedRewardAmount: 0,
        });
      }

      // 检查是否可重复完成
      if (task.repeatType === TaskRepeatType.ONCE) {
        if (progress.status === UserTaskStatus.COMPLETED) {
          throw new BadRequestException('Task already completed');
        }
      } else {
        // 检查重复任务的完成限制
        await this.checkRepeatTaskLimit(userId, taskId, task);
      }

      // 使用任务处理器进行验证
      const taskHandler = this.taskHandlerFactory.getHandlerForTask(task);

      const validationResult = await taskHandler.validate(
        task,
        completionData || {},
        progress,
      );

      if (!validationResult.valid) {
        throw new BadRequestException(
          validationResult.message || 'Task validation failed',
        );
      }

      // 使用奖励处理器计算奖励
      let rewardAmount = 0;
      if (rewards && rewards.length > 0) {
        // 取第一个奖励（可以根据业务逻辑选择）
        const reward = rewards[0];
        const rewardHandler = this.rewardHandlerFactory.getHandler(
          reward.grantType,
        );
        const rewardResult = await rewardHandler.calculate(
          reward,
          progress,
          completionData || {},
        );
        rewardAmount = rewardResult.amount;
      }

      // 更新任务进度
      console.log('accumulatedRewardAmount', progress);
      progress.completionCount += 1;
      progress.status = UserTaskStatus.COMPLETED;
      progress.accumulatedRewardAmount = new Decimal(
        progress.accumulatedRewardAmount,
      )
        .plus(rewardAmount)
        .toNumber();

      if (!progress.firstCompletedAt) {
        progress.firstCompletedAt = new Date();
      }
      progress.lastCompletedAt = new Date();

      if (completionData) {
        progress.metadata = completionData;
      }

      await manager.save(progress);

      // 创建完成记录
      const completion = manager.create(TaskCompletion, {
        userId,
        taskId,
        campaignId,
        rewardAmount,
        completionData,
        referenceId,
        completedAt: new Date(),
      });
      await manager.save(completion);

      // 更新用户任务奖励（如果奖励金额大于0）
      if (rewardAmount > 0) {
        console.log('rewards', rewards);
        const reward = rewards[0];
        const rewardType = reward?.rewardType || RewardType.CASH;
        const currency = reward?.currency || 'USD';
        // 在同一事务中更新用户任务奖励
        await this.userTaskRewardService.addReward(
          userId,
          rewardType,
          rewardAmount,
          currency,
          manager,
        );
      }

      // 更新活动进度
      await this.campaignService.updateCampaignProgress(
        userId,
        campaignId,
        rewardAmount,
      );

      this.logger.log(
        `User ${userId} completed task ${taskId}, reward amount: ${rewardAmount}`,
      );

      return { progress, rewardAmount };
    });
  }

  /**
   * 检查重复任务限制
   */
  private async checkRepeatTaskLimit(
    userId: string,
    taskId: number,
    task: Task,
  ): Promise<void> {
    if (task.repeatType === TaskRepeatType.DAILY) {
      // 检查今日是否已完成
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayCompletions = await this.taskCompletionRepository.count({
        where: {
          userId,
          taskId,
          completedAt: MoreThanOrEqual(today),
        },
      });

      if (todayCompletions >= task.maxCompletions) {
        throw new BadRequestException('Daily task completion limit reached');
      }
    } else if (task.repeatType === TaskRepeatType.WEEKLY) {
      // 检查本周是否已完成
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const weekCompletions = await this.taskCompletionRepository.count({
        where: {
          userId,
          taskId,
          completedAt: MoreThanOrEqual(weekStart),
        },
      });

      if (weekCompletions >= task.maxCompletions) {
        throw new BadRequestException('Weekly task completion limit reached');
      }
    } else if (task.repeatType === TaskRepeatType.MONTHLY) {
      // 检查本月是否已完成
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);

      const monthCompletions = await this.taskCompletionRepository.count({
        where: {
          userId,
          taskId,
          completedAt: MoreThanOrEqual(monthStart),
        },
      });

      if (monthCompletions >= task.maxCompletions) {
        throw new BadRequestException('Monthly task completion limit reached');
      }
    }
  }

  /**
   * 获取用户任务进度
   */
  async getUserTaskProgress(
    userId: string,
    taskId: number,
  ): Promise<UserTaskProgress | null> {
    return await this.userTaskProgressRepository.findOne({
      where: { userId, taskId },
    });
  }

  /**
   * 获取用户的所有任务进度
   */
  async getUserTasksProgress(
    userId: string,
    campaignId?: number,
  ): Promise<UserTaskProgress[]> {
    const where: any = { userId };
    if (campaignId) {
      where.campaignId = campaignId;
    }

    return await this.userTaskProgressRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 获取任务完成历史
   */
  async getTaskCompletions(
    userId: string,
    taskId?: number,
    limit = 20,
    offset = 0,
  ): Promise<{ completions: TaskCompletion[]; total: number }> {
    const where: any = { userId };
    if (taskId) {
      where.taskId = taskId;
    }

    const [completions, total] =
      await this.taskCompletionRepository.findAndCount({
        where,
        order: { completedAt: 'DESC' },
        take: limit,
        skip: offset,
      });

    return { completions, total };
  }
}
