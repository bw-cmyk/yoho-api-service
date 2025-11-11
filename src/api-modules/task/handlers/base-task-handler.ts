import { Task, TaskType } from '../entities/task.entity';
import { UserTaskProgress } from '../entities/user-task-progress.entity';

/**
 * 任务完成数据
 */
export interface TaskCompletionData {
  userId: string;
  taskId: number;
  completionData?: Record<string, any>;
  referenceId?: string;
}

/**
 * 任务校验结果
 */
export interface TaskValidationResult {
  valid: boolean;
  message?: string;
  errorCode?: string;
}

/**
 * 任务处理器抽象基类
 * 只负责任务验证，奖励计算由独立的 RewardHandler 处理
 */
export abstract class BaseTaskHandler {
  /**
   * 获取支持的任务类型
   */
  abstract getSupportedTypes(): TaskType[];

  /**
   * 验证任务完成条件
   * @param task 任务实体
   * @param completionData 完成数据
   * @param userProgress 用户任务进度
   * @returns 校验结果
   */
  abstract validate(
    task: Task,
    userProgress?: UserTaskProgress,
  ): Promise<TaskValidationResult>;

  /**
   * 检查任务类型是否支持
   */
  supports(taskType: TaskType): boolean {
    return this.getSupportedTypes().includes(taskType);
  }

  // /**
  //  * 验证基础条件（可以在子类中重写）
  //  */
  // protected validateBaseConditions(
  //   task: Task,
  //   completionData: Record<string, any>,
  // ): TaskValidationResult {
  //   const conditions = task.completionConditions || {};

  //   // 检查最小金额
  //   if (conditions.minAmount !== undefined) {
  //     const amount = completionData.amount || 0;
  //     if (amount < conditions.minAmount) {
  //       return {
  //         valid: false,
  //         message: `Amount ${amount} is less than required ${conditions.minAmount}`,
  //         errorCode: 'INSUFFICIENT_AMOUNT',
  //       };
  //     }
  //   }

  //   // 检查币种
  //   if (
  //     conditions.coinType &&
  //     completionData.coinType !== conditions.coinType
  //   ) {
  //     return {
  //       valid: false,
  //       message: `Coin type mismatch, expected ${conditions.coinType}, got ${completionData.coinType}`,
  //       errorCode: 'COIN_TYPE_MISMATCH',
  //     };
  //   }

  //   // 检查目标ID
  //   if (
  //     conditions.targetId &&
  //     completionData.targetId !== conditions.targetId
  //   ) {
  //     return {
  //       valid: false,
  //       message: `Target ID mismatch`,
  //       errorCode: 'TARGET_ID_MISMATCH',
  //     };
  //   }

  //   return { valid: true };
  // }
}
