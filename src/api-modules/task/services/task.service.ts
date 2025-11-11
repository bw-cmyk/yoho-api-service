import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskReward } from '../entities/task-reward.entity';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TaskReward)
    private taskRewardRepository: Repository<TaskReward>,
  ) {}

  /**
   * 创建任务
   */
  async createTask(
    data: Partial<Task>,
    rewards?: Partial<TaskReward>[],
  ): Promise<Task> {
    const task = this.taskRepository.create(data);
    const savedTask = await this.taskRepository.save(task);

    // 创建奖励
    if (rewards && rewards.length > 0) {
      const taskRewards = rewards.map((rewardData) =>
        this.taskRewardRepository.create({
          ...rewardData,
          taskId: savedTask.id,
        }),
      );
      await this.taskRewardRepository.save(taskRewards);
    }

    return await this.getTaskById(savedTask.id);
  }

  /**
   * 更新任务
   */
  async updateTask(id: number, data: Partial<Task>): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    Object.assign(task, data);
    return await this.taskRepository.save(task);
  }

  /**
   * 获取任务详情（包含奖励）
   */
  async getTaskById(id: number): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
    });
    if (!task) {
      throw new NotFoundException(`Task with id ${id} not found`);
    }
    return task;
  }

  /**
   * 获取活动下的所有任务
   */
  async getTasksByCampaignId(campaignId: number): Promise<Task[]> {
    return await this.taskRepository.find({
      where: { campaignId },
      order: { sortOrder: 'ASC' },
    });
  }

  /**
   * 获取所有任务
   */
  async getTasks(filters?: {
    campaignId?: number;
    type?: string;
    status?: string;
  }): Promise<Task[]> {
    const query = this.taskRepository.createQueryBuilder('task');

    if (filters?.campaignId) {
      query.andWhere('task.campaignId = :campaignId', {
        campaignId: filters.campaignId,
      });
    }

    if (filters?.type) {
      query.andWhere('task.type = :type', { type: filters.type });
    }
    if (filters?.status) {
      query.andWhere('task.status = :status', { status: filters.status });
    }

    query.orderBy('task.sortOrder', 'ASC');
    return await query.getMany();
  }

  /**
   * 添加任务奖励
   */
  async addTaskReward(
    taskId: number,
    rewardData: Partial<TaskReward>,
  ): Promise<TaskReward> {
    const reward = this.taskRewardRepository.create({
      ...rewardData,
      taskId,
    });
    return await this.taskRewardRepository.save(reward);
  }

  /**
   * 更新任务奖励
   */
  async updateTaskReward(
    id: number,
    rewardData: Partial<TaskReward>,
  ): Promise<TaskReward> {
    const reward = await this.taskRewardRepository.findOne({ where: { id } });
    if (!reward) {
      throw new NotFoundException(`Task reward with id ${id} not found`);
    }
    Object.assign(reward, rewardData);
    return await this.taskRewardRepository.save(reward);
  }

  /**
   * 删除任务奖励
   */
  async deleteTaskReward(id: number): Promise<void> {
    await this.taskRewardRepository.delete(id);
  }

  async getTaskRewards(campaignId: number): Promise<TaskReward[]> {
    return await this.taskRewardRepository.find({
      where: { campaignId },
    });
  }
}
