import { Injectable } from '@nestjs/common';
import { Task, TaskType } from '../entities/task.entity';
import { BaseTaskHandler } from './base-task-handler';
import { RegisterTaskHandler } from './register-task-handler';
import { DepositTaskHandler } from './deposit-task-handler';
import { CheckInTaskHandler } from './checkin-task-handler';
import { TradeTaskHandler } from './trade-task-handler';
import { GameTaskHandler } from './game-task-handler';
import { SocialTaskHandler } from './social-task-handler';
import { DefaultTaskHandler } from './default-task-handler';

/**
 * 任务处理器工厂
 */
@Injectable()
export class TaskHandlerFactory {
  private handlers: BaseTaskHandler[];

  constructor(
    private registerHandler: RegisterTaskHandler,
    private depositHandler: DepositTaskHandler,
    private checkInHandler: CheckInTaskHandler,
    private tradeHandler: TradeTaskHandler,
    private gameHandler: GameTaskHandler,
    private socialHandler: SocialTaskHandler,
    private defaultHandler: DefaultTaskHandler,
  ) {
    // 按优先级注册处理器
    this.handlers = [
      registerHandler,
      depositHandler,
      checkInHandler,
      tradeHandler,
      gameHandler,
      socialHandler,
      defaultHandler, // 默认处理器放在最后
    ];
  }

  /**
   * 根据任务类型获取对应的处理器
   */
  getHandler(taskType: TaskType): BaseTaskHandler {
    const handler = this.handlers.find((h) => h.supports(taskType));
    if (!handler) {
      return this.defaultHandler;
    }
    return handler;
  }

  /**
   * 根据任务实体获取对应的处理器
   */
  getHandlerForTask(task: Task): BaseTaskHandler {
    return this.getHandler(task.type);
  }

  /**
   * 注册自定义处理器
   */
  registerCustomHandler(handler: BaseTaskHandler, _priority = 0): void {
    // 可以在这里实现动态注册处理器的逻辑
    // 目前先使用静态注册方式
  }
}
