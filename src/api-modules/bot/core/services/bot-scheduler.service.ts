import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BotTask } from '../entities/bot-task.entity';
import { BotTaskLog } from '../entities/bot-task-log.entity';
import { IBotExecutor } from '../interfaces/bot-executor.interface';

@Injectable()
export class BotSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(BotSchedulerService.name);
  private executors: Map<string, IBotExecutor> = new Map();

  constructor(
    @InjectRepository(BotTask)
    private readonly botTaskRepository: Repository<BotTask>,
    @InjectRepository(BotTaskLog)
    private readonly botTaskLogRepository: Repository<BotTaskLog>,
  ) {}

  onModuleInit() {
    this.logger.log('BotSchedulerService initialized');
  }

  /**
   * 注册执行器
   */
  registerExecutor(executor: IBotExecutor): void {
    this.executors.set(executor.type, executor);
    this.logger.log(`Registered executor: ${executor.type}`);
  }

  /**
   * 定时检查并执行任务（每10秒）
   */
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkAndExecuteTasks(): Promise<void> {
    const now = new Date();

    // 查找所有启用的、到时间该执行的任务
    const tasks = await this.botTaskRepository.find({
      where: [
        {
          enabled: true,
          nextExecuteAt: LessThanOrEqual(now),
        },
        {
          enabled: true,
          nextExecuteAt: null as any, // 首次执行
        },
      ],
    });

    if (tasks.length === 0) {
      return;
    }

    this.logger.log(`Found ${tasks.length} tasks to execute`);

    // 并发执行所有任务
    const promises = tasks.map((task) =>
      this.executeTask(task).catch((error) => {
        this.logger.error(
          `Task execution failed for task ${task.id}`,
          error,
        );
      }),
    );

    await Promise.allSettled(promises);
  }

  /**
   * 执行单个任务
   */
  private async executeTask(task: BotTask): Promise<void> {
    const executor = this.executors.get(task.taskType);

    if (!executor) {
      this.logger.error(`No executor found for task type: ${task.taskType}`);
      return;
    }

    const startTime = Date.now();

    try {
      // 检查是否可以执行
      const canExecute = await executor.canExecute(task);

      if (!canExecute) {
        this.logger.debug(`Task ${task.id} cannot execute now, skipping`);

        // 记录 SKIPPED 日志
        await this.botTaskLogRepository.save({
          taskId: task.id,
          taskType: task.taskType,
          botUserId: 'N/A',
          status: 'SKIPPED',
          details: { reason: 'canExecute returned false' },
          executionTimeMs: Date.now() - startTime,
        });

        // 计算下次执行时间
        task.nextExecuteAt = executor.calculateNextExecuteTime(task);
        await this.botTaskRepository.save(task);

        return;
      }

      // 获取可用的机器人
      const botUser = await executor.getAvailableBot(task);

      if (!botUser) {
        this.logger.warn(`No available bot for task ${task.id}, skipping`);

        // 记录 SKIPPED 日志
        await this.botTaskLogRepository.save({
          taskId: task.id,
          taskType: task.taskType,
          botUserId: 'N/A',
          status: 'SKIPPED',
          details: { reason: 'No available bot user' },
          executionTimeMs: Date.now() - startTime,
        });

        // 稍后重试（5分钟后）
        task.nextExecuteAt = new Date(Date.now() + 5 * 60 * 1000);
        await this.botTaskRepository.save(task);

        return;
      }

      // 执行任务
      const logPartial = await executor.execute(task, botUser);

      // 保存执行日志
      await this.botTaskLogRepository.save({
        ...logPartial,
        taskId: task.id,
        taskType: task.taskType,
        executionTimeMs: Date.now() - startTime,
      });

      // 更新任务状态
      task.lastExecutedAt = new Date();
      task.executionsToday++;
      task.nextExecuteAt = executor.calculateNextExecuteTime(task);

      await this.botTaskRepository.save(task);

      this.logger.log(
        `Task ${task.id} (${task.taskType}) executed successfully by bot ${botUser.userId}`,
      );
    } catch (error) {
      this.logger.error(`Task ${task.id} execution failed`, error);

      // 记录 FAILED 日志
      await this.botTaskLogRepository.save({
        taskId: task.id,
        taskType: task.taskType,
        botUserId: 'N/A',
        status: 'FAILED',
        errorMessage: error.message || String(error),
        details: {
          stack: error.stack,
        },
        executionTimeMs: Date.now() - startTime,
      });

      // 发生错误时延长下次执行时间（1小时后重试）
      task.nextExecuteAt = new Date(Date.now() + 60 * 60 * 1000);
      await this.botTaskRepository.save(task);
    }
  }

  /**
   * 启动任务
   */
  async startTask(taskId: number): Promise<void> {
    const task = await this.botTaskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.enabled = true;
    task.nextExecuteAt = new Date(); // 立即执行

    await this.botTaskRepository.save(task);

    this.logger.log(`Task ${taskId} started`);
  }

  /**
   * 停止任务
   */
  async stopTask(taskId: number): Promise<void> {
    const task = await this.botTaskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    task.enabled = false;

    await this.botTaskRepository.save(task);

    this.logger.log(`Task ${taskId} stopped`);
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: number): Promise<{
    running: boolean;
    lastExecutedAt: Date;
    nextExecuteAt: Date;
    executionsToday: number;
  }> {
    const task = await this.botTaskRepository.findOne({
      where: { id: taskId },
    });

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    return {
      running: task.enabled,
      lastExecutedAt: task.lastExecutedAt,
      nextExecuteAt: task.nextExecuteAt,
      executionsToday: task.executionsToday,
    };
  }

  /**
   * 重置每日计数（每天零点执行）
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyCounters(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await this.botTaskRepository
      .createQueryBuilder()
      .update(BotTask)
      .set({
        executionsToday: 0,
        lastResetDate: new Date(today),
      })
      .where('last_reset_date != :today OR last_reset_date IS NULL', { today })
      .execute();

    this.logger.log('Daily counters reset');
  }
}
