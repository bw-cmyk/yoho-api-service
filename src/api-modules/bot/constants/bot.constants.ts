/**
 * Bot module constants
 */

export const BOT_MODULE_NAME = 'BotModule';

export const BOT_TASK_TYPES = {
  LUCKY_DRAW: 'LUCKY_DRAW',
  // Future types can be added here
  // BTC_PREDICTION: 'BTC_PREDICTION',
  // SOCIAL_ENGAGEMENT: 'SOCIAL_ENGAGEMENT',
} as const;

export const BOT_USER_ROLE_PREFIX = 'BOT_';

export const DEFAULT_BOT_BALANCE_WARNING_THRESHOLD = 10; // USD

export const BOT_SCHEDULER_CHECK_INTERVAL = 10000; // 10 seconds
