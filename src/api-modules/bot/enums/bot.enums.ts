/**
 * Bot module enums
 */

export enum BotTaskStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export enum BotTaskLogStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export type BotTaskType = 'LUCKY_DRAW' | 'BTC_PREDICTION' | 'SOCIAL_ENGAGEMENT';
