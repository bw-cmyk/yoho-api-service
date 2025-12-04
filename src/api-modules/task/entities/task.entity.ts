import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

/**
 * 任务类型
 */
export enum TaskType {
  REGISTER = 'REGISTER', // 注册
  DEPOSIT = 'DEPOSIT', // 充值
  CHECK_IN = 'CHECK_IN', // 签到
  ADD_BOTIM_FRIEND = 'ADD_BOTIM_FRIEND', // 添加botim小助手
  FOLLOW_BOTIM_OFFICIAL = 'FOLLOW_BOTIM_OFFICIAL', // 关注botim公众号
  TRADE_BTC = 'TRADE_BTC', // 交易BTC
  PLAY_PREDICTION = 'PLAY_PREDICTION', // 玩猜涨跌游戏
  TRADE_VOLUME = 'TRADE_VOLUME', // 交易流水
  GAME_VOLUME = 'GAME_VOLUME', // 游戏流水
  CUSTOM = 'CUSTOM', // 自定义任务
  TRADE_VOLUME_FIRST_DEPOSIT = 'TRADE_VOLUME_FIRST_DEPOSIT', // 交易流水首次充值
}

/**
 * 任务重复类型
 */
export enum TaskRepeatType {
  ONCE = 'ONCE', // 一次性任务
  DAILY = 'DAILY', // 每日重复
  WEEKLY = 'WEEKLY', // 每周重复
  MONTHLY = 'MONTHLY', // 每月重复
  UNLIMITED = 'UNLIMITED', // 无限制重复
}

/**
 * 任务实体
 */
@Entity('yoho_campaign_tasks')
@Index(['campaignId', 'sortOrder'])
@Index(['type', 'status'])
export class Task {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', name: 'campaign_id' })
  campaignId: number;

  @Column({ type: 'varchar', length: 128 })
  name: string; // 任务名称

  @Column({ type: 'text', nullable: true })
  description: string; // 任务描述

  @Column({
    type: 'enum',
    enum: TaskType,
  })
  type: TaskType; // 任务类型

  @Column({
    type: 'enum',
    enum: TaskRepeatType,
    default: TaskRepeatType.ONCE,
    name: 'repeat_type',
  })
  repeatType: TaskRepeatType; // 重复类型

  @Column({ type: 'int', default: 1, name: 'max_completions' })
  maxCompletions: number; // 最大完成次数（对于重复任务，表示每日/每周等的最大次数）

  @Column({ type: 'json', nullable: true, name: 'completion_conditions' })
  completionConditions: {
    // 完成条件配置
    minAmount?: number; // 最小金额（如交易流水≥$10）
    currency?: string; // 货币类型
    coinType?: string; // 币种（如BTC）
    targetId?: string; // 目标ID（如botim账号ID）
    tradeVolumeMultiple?: number; // 交易流水倍数
    [key: string]: any;
  };

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date; // 截止时间（null表示无截止时间）

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'redirect_url',
  })
  redirectUrl: string; // 跳转链接

  @Column({ type: 'int', default: 0, name: 'sort_order' })
  sortOrder: number; // 排序优先级（用于首页展示）

  @Column({ type: 'boolean', default: true, name: 'is_locked' })
  isLocked: boolean; // 是否锁定（false表示无锁定状态）

  @Column({ type: 'varchar', length: 32, default: 'ACTIVE' })
  status: string; // 任务状态（ACTIVE, DISABLED等）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt: Date;
}
