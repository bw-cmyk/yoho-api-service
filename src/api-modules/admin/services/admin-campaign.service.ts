import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { Campaign, CampaignStatus } from '../../task/entities/campaign.entity';
import { Task } from '../../task/entities/task.entity';
import { TaskReward } from '../../task/entities/task-reward.entity';
import { UserCampaignProgress } from '../../task/entities/user-campaign-progress.entity';
import { TaskCompletion } from '../../task/entities/task-completion.entity';

@Injectable()
export class AdminCampaignService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TaskReward)
    private taskRewardRepository: Repository<TaskReward>,
    @InjectRepository(UserCampaignProgress)
    private userCampaignProgressRepository: Repository<UserCampaignProgress>,
    @InjectRepository(TaskCompletion)
    private taskCompletionRepository: Repository<TaskCompletion>,
  ) {}

  // ==================== Campaign CRUD ====================

  async findAllCampaigns(query: {
    page?: number;
    limit?: number;
    keyword?: string;
    status?: CampaignStatus;
  }) {
    const { page = 1, limit = 10, keyword, status } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Campaign> = {};
    if (keyword) {
      where.name = Like(`%${keyword}%`);
    }
    if (status) {
      where.status = status;
    }

    const [data, total] = await this.campaignRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneCampaign(id: number) {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }

    const tasks = await this.taskRepository.find({
      where: { campaignId: id },
      order: { sortOrder: 'ASC' },
    });

    const taskIds = tasks.map((t) => t.id);
    let rewards: TaskReward[] = [];
    if (taskIds.length > 0) {
      rewards = await this.taskRewardRepository.find({
        where: { campaignId: id },
      });
    }

    const rewardsMap = new Map<number, TaskReward[]>();
    rewards.forEach((r) => {
      const list = rewardsMap.get(r.taskId) || [];
      list.push(r);
      rewardsMap.set(r.taskId, list);
    });

    const tasksWithRewards = tasks.map((task) => ({
      ...task,
      rewards: rewardsMap.get(task.id) || [],
    }));

    return { ...campaign, tasks: tasksWithRewards };
  }

  async createCampaign(data: Partial<Campaign>) {
    const campaign = this.campaignRepository.create(data);
    return this.campaignRepository.save(campaign);
  }

  async updateCampaign(id: number, data: Partial<Campaign>) {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    Object.assign(campaign, data);
    return this.campaignRepository.save(campaign);
  }

  async deleteCampaign(id: number) {
    const campaign = await this.campaignRepository.findOne({ where: { id } });
    if (!campaign) {
      throw new NotFoundException(`Campaign #${id} not found`);
    }
    await this.campaignRepository.softRemove(campaign);
    return { success: true, message: 'Campaign deleted' };
  }

  async setCampaignStatus(id: number, status: CampaignStatus) {
    await this.campaignRepository.update(id, { status });
    return this.findOneCampaign(id);
  }

  async getCampaignStats() {
    const total = await this.campaignRepository.count();
    const active = await this.campaignRepository.count({
      where: { status: CampaignStatus.ACTIVE },
    });
    const draft = await this.campaignRepository.count({
      where: { status: CampaignStatus.DRAFT },
    });
    const paused = await this.campaignRepository.count({
      where: { status: CampaignStatus.PAUSED },
    });
    const ended = await this.campaignRepository.count({
      where: { status: CampaignStatus.ENDED },
    });

    return { total, active, draft, paused, ended };
  }

  // ==================== Task CRUD ====================

  async findAllTasks(query: {
    campaignId?: number;
    page?: number;
    limit?: number;
  }) {
    const { campaignId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Task> = {};
    if (campaignId) {
      where.campaignId = campaignId;
    }

    const [data, total] = await this.taskRepository.findAndCount({
      where,
      skip,
      take: limit,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    // Attach rewards
    const taskIds = data.map((t) => t.id);
    let rewards: TaskReward[] = [];
    if (taskIds.length > 0) {
      rewards = await this.taskRewardRepository
        .createQueryBuilder('r')
        .where('r.taskId IN (:...taskIds)', { taskIds })
        .getMany();
    }

    const rewardsMap = new Map<number, TaskReward[]>();
    rewards.forEach((r) => {
      const list = rewardsMap.get(r.taskId) || [];
      list.push(r);
      rewardsMap.set(r.taskId, list);
    });

    const tasksWithRewards = data.map((task) => ({
      ...task,
      rewards: rewardsMap.get(task.id) || [],
    }));

    return {
      data: tasksWithRewards,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async createTask(
    data: Partial<Task>,
    rewards?: Partial<TaskReward>[],
  ) {
    const task = this.taskRepository.create(data);
    const savedTask = await this.taskRepository.save(task);

    if (rewards && rewards.length > 0) {
      const taskRewards = rewards.map((rewardData) =>
        this.taskRewardRepository.create({
          ...rewardData,
          taskId: savedTask.id,
          campaignId: savedTask.campaignId,
        }),
      );
      await this.taskRewardRepository.save(taskRewards);
    }

    return this.findOneTask(savedTask.id);
  }

  async findOneTask(id: number) {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    const rewards = await this.taskRewardRepository.find({
      where: { taskId: id },
    });
    return { ...task, rewards };
  }

  async updateTask(id: number, data: Partial<Task>) {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    Object.assign(task, data);
    return this.taskRepository.save(task);
  }

  async deleteTask(id: number) {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task #${id} not found`);
    }
    await this.taskRepository.softRemove(task);
    return { success: true, message: 'Task deleted' };
  }

  // ==================== Task Reward CRUD ====================

  async addTaskReward(taskId: number, rewardData: Partial<TaskReward>) {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) {
      throw new NotFoundException(`Task #${taskId} not found`);
    }
    const reward = this.taskRewardRepository.create({
      ...rewardData,
      taskId,
      campaignId: task.campaignId,
    });
    return this.taskRewardRepository.save(reward);
  }

  async updateTaskReward(id: number, rewardData: Partial<TaskReward>) {
    const reward = await this.taskRewardRepository.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException(`Task reward #${id} not found`);
    }
    Object.assign(reward, rewardData);
    return this.taskRewardRepository.save(reward);
  }

  async deleteTaskReward(id: number) {
    const reward = await this.taskRewardRepository.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException(`Task reward #${id} not found`);
    }
    await this.taskRewardRepository.softRemove(reward);
    return { success: true, message: 'Task reward deleted' };
  }

  // ==================== Stats ====================

  async getCampaignParticipants(
    campaignId: number,
    query: { page?: number; limit?: number },
  ) {
    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [data, total] =
      await this.userCampaignProgressRepository.findAndCount({
        where: { campaignId },
        skip,
        take: limit,
        order: { createdAt: 'DESC' },
      });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
