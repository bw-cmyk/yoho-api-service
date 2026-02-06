/**
 * 通知类型
 */
export enum NotificationType {
  SYSTEM = 'SYSTEM', // 系统公告
  PRIZE_WON = 'PRIZE_WON', // 中奖通知
  SHIPPING_UPDATE = 'SHIPPING_UPDATE', // 发货更新
  ORDER_UPDATE = 'ORDER_UPDATE', // 订单更新
  ACCOUNT = 'ACCOUNT', // 账户通知
  PROMOTION = 'PROMOTION', // 促销通知
}

/**
 * 通知状态
 */
export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
}

/**
 * 通知目标类型
 */
export enum NotificationTargetType {
  ALL = 'ALL', // 全体用户
  SINGLE_USER = 'SINGLE_USER', // 单个用户
}
