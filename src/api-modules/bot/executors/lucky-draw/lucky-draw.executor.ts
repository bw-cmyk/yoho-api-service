import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Decimal } from 'decimal.js';
import { IBotExecutor } from '../../core/interfaces/bot-executor.interface';
import { BotTask } from '../../core/entities/bot-task.entity';
import { BotUser } from '../../core/entities/bot-user.entity';
import { BotTaskLog } from '../../core/entities/bot-task-log.entity';
import { BotLuckyDrawConfig } from './lucky-draw.config.entity';
import { BotUserService } from '../../core/services/bot-user.service';
import { BotSchedulerService } from '../../core/services/bot-scheduler.service';
import { DrawService } from '../../../ecommerce/services/draw.service';
import { BOT_TASK_TYPES } from '../../constants/bot.constants';

@Injectable()
export class LuckyDrawExecutor implements IBotExecutor, OnModuleInit {
  readonly type = BOT_TASK_TYPES.LUCKY_DRAW;
  private readonly logger = new Logger(LuckyDrawExecutor.name);

  constructor(
    @InjectRepository(BotLuckyDrawConfig)
    private readonly configRepository: Repository<BotLuckyDrawConfig>,
    private readonly botUserService: BotUserService,
    private readonly drawService: DrawService,
    private readonly schedulerService: BotSchedulerService,
  ) {}

  onModuleInit() {
    // 向调度器注册自己
    this.schedulerService.registerExecutor(this);
    this.logger.log('LuckyDrawExecutor registered');
  }

  /**
   * 执行一次任务
   */
  async execute(
    task: BotTask,
    botUser: BotUser,
  ): Promise<Partial<BotTaskLog>> {
    const productId = parseInt(task.targetId);
    const config = await this.getConfig(productId);

    if (!config) {
      throw new Error(`Config not found for product ${productId}`);
    }

    // 计算随机下单数量
    const quantity = this.calculateQuantity(config);

    this.logger.log(
      `Bot ${botUser.userId} purchasing ${quantity} spots for product ${productId}`,
    );

    try {
      // 执行下单
      const result = await this.drawService.purchaseSpots(
        botUser.userId,
        productId,
        quantity,
      );

      return {
        botUserId: botUser.userId,
        status: 'SUCCESS',
        details: {
          productId,
          quantity,
          orderNumber: result.orderNumber,
          drawRoundId: result.drawRound.id,
          roundNumber: result.drawRound.roundNumber,
          startNumber: result.participation.startNumber,
          endNumber: result.participation.endNumber,
          totalAmount: result.participation.totalAmount.toString(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to purchase spots for product ${productId}`,
        error,
      );

      return {
        botUserId: botUser.userId,
        status: 'FAILED',
        errorMessage: error.message || String(error),
        details: {
          productId,
          quantity,
          error: error.message,
        },
      };
    }
  }

  /**
   * 检查是否可以执行
   */
  async canExecute(task: BotTask): Promise<boolean> {
    const productId = parseInt(task.targetId);
    const config = await this.getConfig(productId);

    // 检查配置是否启用
    if (!config?.enabled) {
      return false;
    }

    // 检查活跃时段
    if (!this.isActiveHour(config)) {
      this.logger.debug(`Not in active hours for product ${productId}`);
      return false;
    }

    // 检查每日限额
    if (task.executionsToday >= config.dailyOrderLimit) {
      this.logger.debug(
        `Daily limit reached for product ${productId}: ${task.executionsToday}/${config.dailyOrderLimit}`,
      );
      return false;
    }

    // 检查填充百分比
    try {
      const round = await this.drawService.getOngoingRoundDetail(productId);

      if (!round) {
        this.logger.debug(`No ongoing round for product ${productId}`);
        return false;
      }

      const fillPercentage = (round.soldSpots / round.totalSpots) * 100;

      if (fillPercentage >= config.maxFillPercentage) {
        this.logger.debug(
          `Fill percentage limit reached for product ${productId}: ${fillPercentage.toFixed(2)}% >= ${config.maxFillPercentage}%`,
        );
        return false;
      }

      // 检查剩余号码数是否足够
      if (round.remainingSpots < config.minQuantity) {
        this.logger.debug(
          `Not enough remaining spots for product ${productId}: ${round.remainingSpots} < ${config.minQuantity}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(
        `Failed to check round status for product ${productId}`,
        error,
      );
      return false;
    }

    return true;
  }

  /**
   * 计算下次执行时间
   */
  calculateNextExecuteTime(task: BotTask): Date {
    const productId = parseInt(task.targetId);

    // 从 task.config 中读取配置（如果任务有覆盖配置）
    // 否则使用默认配置
    const minInterval = task.config?.minIntervalSeconds || 30;
    const maxInterval = task.config?.maxIntervalSeconds || 300;

    const delay = this.randomBetween(minInterval, maxInterval);

    const nextTime = new Date(Date.now() + delay * 1000);

    this.logger.debug(
      `Next execution for product ${productId} scheduled in ${delay} seconds`,
    );

    return nextTime;
  }

  /**
   * 获取可用的 Bot 用户
   */
  async getAvailableBot(task: BotTask): Promise<BotUser | null> {
    const productId = parseInt(task.targetId);
    const config = await this.getConfig(productId);

    if (!config) {
      return null;
    }

    // 计算所需最小余额（按最大购买数量计算）
    const round = await this.drawService.getOngoingRoundDetail(productId);

    if (!round) {
      return null;
    }

    const minBalance = round.pricePerSpot.times(config.maxQuantity);

    return this.botUserService.getRandomAvailableBot(minBalance);
  }

  /**
   * 获取产品配置
   */
  private async getConfig(
    productId: number,
  ): Promise<BotLuckyDrawConfig | null> {
    return this.configRepository.findOne({
      where: { productId },
    });
  }

  /**
   * 计算随机购买数量
   */
  private calculateQuantity(config: BotLuckyDrawConfig): number {
    return this.randomBetween(config.minQuantity, config.maxQuantity);
  }

  /**
   * 检查是否在活跃时段
   */
  private isActiveHour(config: BotLuckyDrawConfig): boolean {
    if (!config.activeHours || config.activeHours.length === 0) {
      return true; // 空数组表示全天活跃
    }

    const currentHour = new Date().getHours();
    return config.activeHours.includes(currentHour);
  }

  /**
   * 生成指定范围内的随机整数
   */
  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
