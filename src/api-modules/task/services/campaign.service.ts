import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Campaign, CampaignStatus } from '../entities/campaign.entity';
import {
  UserCampaignProgress,
  UserCampaignStatus,
} from '../entities/user-campaign-progress.entity';
import { Task } from '../entities/task.entity';
import { Decimal } from 'decimal.js';
import { AssetService } from '../../assets/services/asset.service';
import { Currency } from '../../assets/entities/balance/user-asset.entity';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(UserCampaignProgress)
    private userCampaignProgressRepository: Repository<UserCampaignProgress>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    private assetService: AssetService,
    private dataSource: DataSource,
  ) {}

  /**
   * 创建活动
   */
  async createCampaign(data: Partial<Campaign>): Promise<Campaign> {
    const campaign = this.campaignRepository.create(data);
    return await this.campaignRepository.save(campaign);
  }

  /**
   * 更新活动
   */
  async updateCampaign(id: number, data: Partial<Campaign>): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign with id ${id} not found`);
    }
    Object.assign(campaign, data);
    return await this.campaignRepository.save(campaign);
  }

  /**
   * 获取活动详情（包含任务列表）
   */
  async getCampaignById(id: number, includeTasks = true): Promise<Campaign> {
    const campaign = await this.campaignRepository.findOne({
      where: { id },
    });
    if (!campaign) {
      throw new NotFoundException(`Campaign with id ${id} not found`);
    }
    return campaign;
  }

  /**
   * 获取活动列表
   */
  async getCampaigns(filters?: {
    status?: CampaignStatus;
    isVisible?: boolean;
  }): Promise<Campaign[]> {
    const query = this.campaignRepository.createQueryBuilder('campaign');

    if (filters?.status) {
      query.andWhere('campaign.status = :status', { status: filters.status });
    }
    if (filters?.isVisible !== undefined) {
      query.andWhere('campaign.isVisible = :isVisible', {
        isVisible: filters.isVisible,
      });
    }

    query.orderBy('campaign.sortOrder', 'ASC');
    return await query.getMany();
  }

  /**
   * 用户参与活动
   */
  async participateCampaign(
    userId: string,
    campaignId: number,
  ): Promise<UserCampaignProgress> {
    // 检查活动是否存在且可参与
    const campaign = await this.getCampaignById(campaignId, false);
    if (campaign.status !== CampaignStatus.ACTIVE) {
      throw new BadRequestException('Campaign is not active');
    }

    // 检查是否已参与
    const existing = await this.userCampaignProgressRepository.findOne({
      where: { userId, campaignId },
    });

    if (existing) {
      return existing;
    }

    // 检查参与条件
    await this.checkParticipationConditions(userId, campaign);

    // 创建参与记录
    const progress = this.userCampaignProgressRepository.create({
      userId,
      campaignId,
      status: UserCampaignStatus.PARTICIPATED,
    });

    return await this.userCampaignProgressRepository.save(progress);
  }

  /**
   * 检查参与条件
   */
  private async checkParticipationConditions(
    userId: string,
    campaign: Campaign,
  ): Promise<void> {
    const conditions = campaign.participationConditions || {};

    // 检查用户范围（这里简化处理，实际可能需要查询用户信息）
    if (conditions.userScope) {
      // TODO: 实现用户范围检查逻辑
      // 例如：检查是否为新用户、现有用户等
    }

    // 检查时间范围
    const now = new Date();
    if (campaign.startTime && now < campaign.startTime) {
      throw new BadRequestException('Campaign has not started yet');
    }
    if (campaign.endTime && now > campaign.endTime) {
      throw new BadRequestException('Campaign has ended');
    }
  }

  /**
   * 获取用户活动进度
   */
  async getUserCampaignProgress(
    userId: string,
    campaignId: number,
  ): Promise<UserCampaignProgress> {
    const progress = await this.userCampaignProgressRepository.findOne({
      where: { userId, campaignId },
    });

    if (!progress) {
      // 如果不存在，自动参与
      return await this.participateCampaign(userId, campaignId);
    }

    return progress;
  }

  /**
   * 更新活动进度（当任务完成时调用）
   */
  async updateCampaignProgress(
    userId: string,
    campaignId: number,
    rewardAmount: number,
  ): Promise<UserCampaignProgress> {
    return await this.dataSource.transaction(async (manager) => {
      const progress = await manager.findOne(UserCampaignProgress, {
        where: { userId, campaignId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!progress) {
        throw new NotFoundException('Campaign progress not found');
      }

      // 确保 progress 是 UserCampaignProgress 类型
      const userProgress = progress as UserCampaignProgress;

      // 更新累计奖励
      userProgress.accumulatedReward = new Decimal(
        userProgress.accumulatedReward,
      )
        .plus(rewardAmount)
        .toNumber();

      // 检查是否达到领取条件
      const campaign = await manager.findOne(Campaign, {
        where: { id: campaignId },
      });

      if (campaign?.rewardConfig) {
        const totalRewardAmount = campaign.rewardConfig.totalRewardAmount || 0;

        if (userProgress.accumulatedReward >= totalRewardAmount) {
          if (userProgress.status === UserCampaignStatus.PARTICIPATED) {
            userProgress.status = UserCampaignStatus.COMPLETED;
            userProgress.completedAt = new Date();

            // 设置领取有效期
            const claimExpiryDays = campaign.rewardConfig.claimExpiryDays || 7;
            userProgress.claimExpiryAt = new Date(
              userProgress.completedAt.getTime() +
                claimExpiryDays * 24 * 60 * 60 * 1000,
            );
          }
        }
      }

      return await manager.save(userProgress);
    });
  }

  /**
   * 领取活动奖励
   */
  async claimCampaignReward(userId: string, campaignId: number): Promise<void> {
    return await this.dataSource.transaction(async (manager) => {
      const progress = await manager.findOne(UserCampaignProgress, {
        where: { userId, campaignId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!progress) {
        throw new NotFoundException('Campaign progress not found');
      }

      // 确保 progress 是 UserCampaignProgress 类型
      const userProgress = progress as UserCampaignProgress;

      // 检查是否已领取
      if (userProgress.status === UserCampaignStatus.REWARD_CLAIMED) {
        throw new BadRequestException('Reward already claimed');
      }

      if (userProgress.status !== UserCampaignStatus.COMPLETED) {
        throw new BadRequestException('Campaign reward is not ready to claim');
      }

      // 检查是否过期
      if (
        userProgress.claimExpiryAt &&
        new Date() > userProgress.claimExpiryAt
      ) {
        userProgress.status = UserCampaignStatus.EXPIRED;
        await manager.save(userProgress);
        throw new BadRequestException('Reward claim has expired');
      }

      // 获取活动配置
      const campaign = await manager.findOne(Campaign, {
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new NotFoundException('Campaign not found');
      }

      const rewardAmount = new Decimal(userProgress.accumulatedReward);

      // 发放奖励到Game Balance（实际余额）
      // 根据需求，任务奖励发放至Game Balance游戏余额，可用于游戏或划转到Cash Balance
      await this.assetService.deposit({
        userId,
        currency: Currency.USD,
        amount: rewardAmount,
        description: `Campaign reward: ${campaign.name}`,
        metadata: {
          campaignId,
          campaignName: campaign.name,
          source: 'CAMPAIGN_REWARD',
        },
      });

      // 更新进度状态
      userProgress.status = UserCampaignStatus.REWARD_CLAIMED;
      userProgress.claimedAt = new Date();
      await manager.save(userProgress);

      this.logger.log(
        `User ${userId} claimed reward ${rewardAmount} for campaign ${campaignId}`,
      );
    });
  }

  /**
   * 获取用户的所有活动进度
   */
  async getUserCampaigns(userId: string): Promise<UserCampaignProgress[]> {
    return await this.userCampaignProgressRepository.find({
      where: { userId },
      relations: ['campaign'],
      order: { createdAt: 'DESC' },
    });
  }
}
