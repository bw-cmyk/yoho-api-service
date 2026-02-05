import { BotTask } from '../entities/bot-task.entity';
import { BotUser } from '../entities/bot-user.entity';
import { BotTaskLog } from '../entities/bot-task-log.entity';

/**
 * Bot Executor Interface
 * 所有 bot 执行器必须实现此接口
 */
export interface IBotExecutor {
  /**
   * 执行器类型标识（如 'LUCKY_DRAW', 'BTC_PREDICTION'）
   */
  readonly type: string;

  /**
   * 执行一次任务
   * @param task 任务配置
   * @param botUser 执行任务的机器人用户
   * @returns 执行日志
   */
  execute(task: BotTask, botUser: BotUser): Promise<Partial<BotTaskLog>>;

  /**
   * 检查当前是否可以执行任务
   * @param task 任务配置
   * @returns 是否可以执行
   */
  canExecute(task: BotTask): Promise<boolean>;

  /**
   * 计算下次执行时间
   * @param task 任务配置
   * @returns 下次执行的时间
   */
  calculateNextExecuteTime(task: BotTask): Date;

  /**
   * 获取一个可用的 Bot 用户
   * @param task 任务配置
   * @returns 可用的 bot 用户，如果没有则返回 null
   */
  getAvailableBot(task: BotTask): Promise<BotUser | null>;
}
