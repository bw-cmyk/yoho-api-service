# Implementation Plan: Notification Center Feature

## Overview

为 yoho-api-service 平台实现通知中心功能，支持中奖通知、发货通知、系统公告和针对单个用户的通知推送。

## Requirements

### 功能需求
1. 用户可接收通知：
   - 抽奖中奖通知
   - 发货状态更新
   - 订单状态变更
   - 账户相关通知
2. 管理员可推送系统公告（全体用户）
3. 管理员可针对单个用户发送通知
4. 用户可查看通知历史（分页）
5. 用户可标记已读（单条/批量）
6. 用户可获取未读数量

---

## 新建文件列表

| 文件路径 | 描述 |
|---------|------|
| `src/api-modules/notification/notification.module.ts` | 通知模块 |
| `src/api-modules/notification/entities/notification.entity.ts` | 通知实体 |
| `src/api-modules/notification/enums/notification.enums.ts` | 枚举定义 |
| `src/api-modules/notification/dto/notification.dto.ts` | DTO 定义 |
| `src/api-modules/notification/services/notification.service.ts` | 核心服务 |
| `src/api-modules/notification/controllers/notification.controller.ts` | 用户控制器 |
| `src/api-modules/admin/services/admin-notification.service.ts` | 管理员服务 |
| `src/api-modules/admin/controllers/admin-notification.controller.ts` | 管理员控制器 |
| `src/api-modules/admin/dto/admin-notification.dto.ts` | 管理员 DTO |

## 修改文件列表

| 文件路径 | 描述 |
|---------|------|
| `src/app.module.ts` | 导入 NotificationModule |
| `src/api-modules/admin/admin.module.ts` | 注册管理员通知组件 |
| `src/api-modules/ecommerce/ecommerce.module.ts` | 导入 NotificationModule |
| `src/api-modules/ecommerce/services/draw.service.ts` | 中奖触发通知 |
| `src/api-modules/ecommerce/services/logistics.service.ts` | 发货触发通知 |
| `src/api-modules/ecommerce/services/order.service.ts` | 订单变更触发通知 |

---

## Phase 1: 核心实体和枚举

### 1.1 创建枚举
**文件:** `src/api-modules/notification/enums/notification.enums.ts`

```typescript
export enum NotificationType {
  SYSTEM = 'SYSTEM',           // 系统公告
  PRIZE_WON = 'PRIZE_WON',     // 中奖通知
  SHIPPING_UPDATE = 'SHIPPING_UPDATE', // 发货更新
  ORDER_UPDATE = 'ORDER_UPDATE',       // 订单更新
  ACCOUNT = 'ACCOUNT',         // 账户通知
  PROMOTION = 'PROMOTION',     // 促销通知
}

export enum NotificationStatus {
  UNREAD = 'UNREAD',
  READ = 'READ',
}

export enum NotificationTargetType {
  ALL = 'ALL',                 // 全体用户
  SINGLE_USER = 'SINGLE_USER', // 单个用户
}
```

### 1.2 创建实体
**文件:** `src/api-modules/notification/entities/notification.entity.ts`

```
表名: yoho_notifications
字段:
  - id: number (自增主键)
  - type: NotificationType (枚举)
  - targetType: NotificationTargetType (枚举)
  - userId: string | null (可空，系统广播时为空)
  - title: string (varchar 255)
  - content: string (text)
  - metadata: json | null (附加数据，如 orderId, drawResultId)
  - imageUrl: string | null (富通知图片)
  - actionType: string | null (如 'ROUTER', 'EXTERNAL_LINK')
  - actionValue: string | null (路由路径或 URL)
  - status: NotificationStatus (默认 UNREAD)
  - readAt: Date | null
  - createdAt: Date
  - updatedAt: Date
  - deletedAt: Date (软删除)

索引:
  - [userId, status, createdAt] - 用户通知查询
  - [type, createdAt] - 管理员筛选
  - [targetType] - 广播跟踪
```

---

## Phase 2: DTO 定义

### 2.1 用户 DTO
**文件:** `src/api-modules/notification/dto/notification.dto.ts`

```
QueryNotificationsDto:
  - status?: NotificationStatus
  - type?: NotificationType
  - page?: number (默认 1)
  - limit?: number (默认 20)

MarkAsReadDto:
  - notificationIds: number[]
```

### 2.2 管理员 DTO
**文件:** `src/api-modules/admin/dto/admin-notification.dto.ts`

```
CreateSystemNotificationDto:
  - title: string (必填)
  - content: string (必填)
  - type?: NotificationType (默认 SYSTEM)
  - imageUrl?: string
  - actionType?: string
  - actionValue?: string

SendUserNotificationDto:
  - userId: string (必填)
  - title: string (必填)
  - content: string (必填)
  - type?: NotificationType (默认 ACCOUNT)
  - imageUrl?: string
  - actionType?: string
  - actionValue?: string
  - metadata?: object

QueryAdminNotificationsDto:
  - type?: NotificationType
  - targetType?: NotificationTargetType
  - startDate?: string
  - endDate?: string
  - keyword?: string
  - page?: number
  - limit?: number
```

---

## Phase 3: 服务层

### 3.1 核心通知服务
**文件:** `src/api-modules/notification/services/notification.service.ts`

```typescript
@Injectable()
export class NotificationService {
  // 用户方法
  getUserNotifications(userId, query): Promise<PaginatedResult>
  getUnreadCount(userId): Promise<number>
  markAsRead(userId, notificationIds): Promise<void>
  markAllAsRead(userId): Promise<void>
  deleteNotification(userId, notificationId): Promise<void>

  // 内部方法
  createNotification(data): Promise<Notification>
  createSystemBroadcast(data): Promise<Notification>
  sendToUser(userId, data): Promise<Notification>

  // 便捷方法
  notifyPrizeWon(userId, drawResult, product): Promise<void>
  notifyShippingUpdate(userId, order, status): Promise<void>
  notifyOrderUpdate(userId, order, status): Promise<void>
}
```

### 3.2 管理员通知服务
**文件:** `src/api-modules/admin/services/admin-notification.service.ts`

```typescript
@Injectable()
export class AdminNotificationService {
  createSystemNotification(dto): Promise<Notification>
  sendToUser(dto): Promise<Notification>
  getAllNotifications(query): Promise<PaginatedResult>
  getStats(): Promise<Stats>
  deleteNotification(id): Promise<void>
}
```

---

## Phase 4: 控制器层

### 4.1 用户控制器
**路径:** `GET|POST|DELETE /api/v1/notifications`

```
GET  /                    - 获取通知列表（分页）
GET  /unread-count        - 获取未读数量
POST /mark-read           - 标记已读
POST /mark-all-read       - 全部标记已读
DELETE /:id               - 删除通知
```

### 4.2 管理员控制器
**路径:** `GET|POST|DELETE /api/v1/admin/notifications`

```
GET  /                    - 获取所有通知（分页）
GET  /stats               - 获取统计数据
POST /system              - 创建系统公告
POST /user                - 发送给指定用户
DELETE /:id               - 删除通知
```

---

## Phase 5: 模块注册

### 5.1 创建 NotificationModule
### 5.2 更新 app.module.ts 导入
### 5.3 更新 admin.module.ts 注册组件

---

## Phase 6: 集成触发

### 6.1 DrawService 集成
在 `distributePrize` 方法中添加中奖通知

### 6.2 LogisticsService 集成
在发货状态变更时添加通知

### 6.3 OrderService 集成
在订单状态变更时添加通知

---

## 风险评估

| 风险 | 级别 | 缓解措施 |
|-----|------|---------|
| 数据库性能 | 中 | 添加索引，实现分页 |
| 循环依赖 | 低 | 使用 forwardRef() |
| 集成副作用 | 中 | try-catch 包裹，不影响核心逻辑 |

---

## 实施顺序

1. **Phase 1:** 创建枚举和实体
2. **Phase 2:** 创建 DTO
3. **Phase 3:** 创建服务
4. **Phase 4:** 创建控制器
5. **Phase 5:** 注册模块
6. **Phase 6:** 集成到现有服务

**WAITING FOR CONFIRMATION**: 是否按此计划实施？
