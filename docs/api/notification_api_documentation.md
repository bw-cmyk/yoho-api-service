# 通知中心 API 文档

## 概述

通知中心为用户提供系统消息的推送和查询功能，支持中奖通知、发货通知、订单状态变更、账户通知等多种类型的通知。

**Base URL**: `/api/v1/notifications`

**认证方式**: Bearer Token (JWT)

---

## 目录

- [获取通知列表](#1-获取通知列表)
- [获取未读数量](#2-获取未读数量)
- [标记已读](#3-标记已读)
- [全部标记已读](#4-全部标记已读)
- [删除通知](#5-删除通知)
- [数据模型](#数据模型)
- [错误码说明](#错误码说明)

---

## 1. 获取通知列表

获取当前用户的通知列表，支持按状态、类型筛选和分页。

### 请求

**Endpoint**: `GET /api/v1/notifications`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| status | string | 否 | 筛选状态：`UNREAD`、`READ` | - |
| type | string | 否 | 筛选类型：`SYSTEM`、`PRIZE_WON`、`SHIPPING_UPDATE`、`ORDER_UPDATE`、`ACCOUNT`、`PROMOTION` | - |
| page | number | 否 | 页码 | 1 |
| limit | number | 否 | 每页数量 | 20 |

**示例**: `GET /api/v1/notifications?status=UNREAD&type=PRIZE_WON&page=1&limit=20`

### 响应

**成功响应** (200):
```json
{
  "items": [
    {
      "id": 123,
      "type": "PRIZE_WON",
      "userId": "373358274021780480",
      "title": "恭喜中奖！",
      "content": "您在一元购活动中获得了 0.005 BTC，请及时领取。",
      "metadata": {
        "drawResultId": 45,
        "drawRoundId": 12,
        "prizeValue": "500.00",
        "prizeType": "PHYSICAL"
      },
      "imageUrl": "https://example.com/images/prize-btc.jpg",
      "actionType": "ROUTER",
      "actionValue": "/draws/12/results/45",
      "status": "UNREAD",
      "readAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 122,
      "type": "SHIPPING_UPDATE",
      "userId": "373358274021780480",
      "title": "您的奖品已发货",
      "content": "您的奖品已通过顺丰速运发出，物流单号：SF1234567890",
      "metadata": {
        "orderId": 88,
        "logisticsCompany": "顺丰速运",
        "trackingNumber": "SF1234567890"
      },
      "imageUrl": null,
      "actionType": "ROUTER",
      "actionValue": "/orders/88",
      "status": "UNREAD",
      "readAt": null,
      "createdAt": "2024-01-14T16:20:00.000Z",
      "updatedAt": "2024-01-14T16:20:00.000Z"
    },
    {
      "id": 121,
      "type": "SYSTEM",
      "userId": "373358274021780480",
      "title": "系统维护通知",
      "content": "系统将于 2024-01-20 02:00-04:00 进行维护，届时部分服务可能不可用。",
      "metadata": null,
      "imageUrl": "https://example.com/images/maintenance.jpg",
      "actionType": null,
      "actionValue": null,
      "status": "READ",
      "readAt": "2024-01-13T09:15:00.000Z",
      "createdAt": "2024-01-13T08:00:00.000Z",
      "updatedAt": "2024-01-13T09:15:00.000Z"
    }
  ],
  "total": 15,
  "page": 1,
  "limit": 20
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 通知ID |
| type | string | 通知类型 |
| userId | string | 用户ID |
| title | string | 通知标题 |
| content | string | 通知内容 |
| metadata | object \| null | 附加数据（JSON） |
| imageUrl | string \| null | 通知配图URL |
| actionType | string \| null | 操作类型：`ROUTER`（页面跳转）、`EXTERNAL_LINK`（外部链接） |
| actionValue | string \| null | 操作值（路由路径或URL） |
| status | string | 阅读状态：`UNREAD`、`READ` |
| readAt | string \| null | 已读时间 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

---

## 2. 获取未读数量

获取当前用户的未读通知数量。

### 请求

**Endpoint**: `GET /api/v1/notifications/unread-count`

**Headers**:
```
Authorization: Bearer {token}
```

**示例**: `GET /api/v1/notifications/unread-count`

### 响应

**成功响应** (200):
```json
{
  "count": 5
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| count | number | 未读通知数量 |

---

## 3. 标记已读

将指定的通知标记为已读。

### 请求

**Endpoint**: `POST /api/v1/notifications/mark-read`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "notificationIds": [123, 122, 121]
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| notificationIds | number[] | 是 | 要标记为已读的通知ID列表 |

### 响应

**成功响应** (200):
```json
{
  "success": true,
  "updatedCount": 3
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| updatedCount | number | 成功更新的通知数量 |

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "部分通知不存在或不属于当前用户",
  "error": "Bad Request"
}
```

**错误响应** (400 - 空数组):
```json
{
  "statusCode": 400,
  "message": "notificationIds 不能为空",
  "error": "Bad Request"
}
```

---

## 4. 全部标记已读

将当前用户的所有未读通知标记为已读。

### 请求

**Endpoint**: `POST /api/v1/notifications/mark-all-read`

**Headers**:
```
Authorization: Bearer {token}
```

**示例**: `POST /api/v1/notifications/mark-all-read`

### 响应

**成功响应** (200):
```json
{
  "success": true,
  "updatedCount": 15
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| success | boolean | 操作是否成功 |
| updatedCount | number | 成功更新的通知数量 |

---

## 5. 删除通知

删除指定的通知（软删除）。

### 请求

**Endpoint**: `DELETE /api/v1/notifications/:id`

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 通知ID |

**示例**: `DELETE /api/v1/notifications/123`

### 响应

**成功响应** (200):
```json
{
  "success": true
}
```

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "通知不存在",
  "error": "Not Found"
}
```

**错误响应** (403):
```json
{
  "statusCode": 403,
  "message": "无权删除此通知",
  "error": "Forbidden"
}
```

---

## 数据模型

### NotificationType（通知类型）

| 类型 | 说明 | metadata 主要内容 |
|------|------|-------------------|
| SYSTEM | 系统公告 | - |
| PRIZE_WON | 中奖通知 | `product`, `drawRound`, `result` (含 winnerUserName) |
| SHIPPING_UPDATE | 发货更新 | `product`, `draw`, `logistics`, `prizeValue` |
| ORDER_UPDATE | 订单更新 | `orderId`, `orderNumber` |
| ACCOUNT | 账户通知 | `reason`, `amount`, `currency` |
| PROMOTION | 促销通知 | `promotionId`, `title`, `endDate` |

### NotificationStatus（通知状态）

| 状态 | 说明 |
|------|------|
| UNREAD | 未读 |
| READ | 已读 |

### ActionType（操作类型）

| 类型 | 说明 | actionValue 示例 |
|------|------|-------------------|
| ROUTER | 应用内路由跳转 | `/draws/12/results/45` |
| EXTERNAL_LINK | 外部链接跳转 | `https://blockchain.info/block/856751` |
| null | 无操作 | - |

### Metadata 结构说明

不同类型的通知包含不同的 metadata 结构：

#### PRIZE_WON（中奖通知）
```json
{
  "drawResultId": 789,
  "product": {
    "id": 10,
    "name": "iPhone 15 Pro",
    "image": "https://example.com/images/iphone15.jpg"
  },
  "drawRound": {
    "id": 5,
    "roundNumber": 1,
    "totalParticipants": 1000
  },
  "result": {
    "winningNumber": 150,
    "prizeType": "PHYSICAL",
    "prizeValue": "899.00",
    "userTicketCount": 10,
    "winnerUserName": "John Doe"
  }
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| drawResultId | number | 中奖记录ID |
| product.id | number | 商品ID |
| product.name | string | 商品名称 |
| product.image | string | 商品图片URL |
| drawRound.id | number | 轮次ID |
| drawRound.roundNumber | number | 轮次号 |
| drawRound.totalParticipants | number | 总参与人数（已售份数） |
| result.winningNumber | number | 中奖号码 |
| result.prizeType | string | 奖品类型：`CASH`、`CRYPTO`、`PHYSICAL` |
| result.prizeValue | string | 奖品价值（USD） |
| result.userTicketCount | number | 用户购买的号码数量 |
| result.winnerUserName | string | 中奖者名称 |

#### SHIPPING_UPDATE（发货更新）
```json
{
  "orderId": 456,
  "orderNumber": "ORD1707840000XYZ",
  "product": {
    "id": 10,
    "name": "iPhone 15 Pro",
    "image": "https://example.com/images/iphone15.jpg"
  },
  "draw": {
    "resultId": 789,
    "roundId": 5,
    "roundNumber": 1
  },
  "logistics": {
    "status": "SHIPPED",
    "company": "SF Express",
    "trackingNumber": "SF1234567890"
  },
  "prizeValue": "899.00"
}
```

| 字段 | 类型 | 说明 |
|------|------|------|
| orderId | number | 订单ID |
| orderNumber | string | 订单号 |
| product.id | number | 商品ID |
| product.name | string | 商品名称 |
| product.image | string | 商品图片URL |
| draw.resultId | number | 中奖记录ID |
| draw.roundId | number | 轮次ID |
| draw.roundNumber | number | 轮次号 |
| logistics.status | string | 物流状态：`SHIPPED`、`DELIVERED`、`IN_TRANSIT` |
| logistics.company | string | 物流公司 |
| logistics.trackingNumber | string | 物流单号 |
| prizeValue | string | 奖品价值（USD） |

#### ORDER_UPDATE（订单更新）
```json
{
  "orderId": 88,
  "orderNumber": "ORD1707840000ABC"
}
```

#### ACCOUNT（账户通知）
```json
{
  "reason": "DEPOSIT",  // DEPOSIT, WITHDRAW, REFUND, BONUS
  "amount": "100.00",
  "currency": "USD"
}
```

#### PROMOTION（促销通知）
```json
{
  "promotionId": 10,
  "title": "新年特惠",
  "endDate": "2024-12-31T23:59:59.999Z"
}
```

---

## 错误码说明

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（需要登录） |
| 403 | 无权限（如删除他人通知） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 常见错误消息

| 错误消息 | 说明 | 解决方案 |
|----------|------|----------|
| notificationIds 不能为空 | 标记已读时未提供通知ID | 检查请求参数 |
| 通知不存在 | 指定的通知ID不存在 | 检查通知ID是否正确 |
| 无权删除此通知 | 尝试删除他人的通知 | 检查登录状态 |
| 部分通知不存在或不属于当前用户 | 部分通知ID无效 | 系统会跳过无效的通知 |

---

## 通知触发场景

### 自动触发通知

以下场景会自动创建通知：

| 场景 | 通知类型 | 触发条件 |
|------|----------|----------|
| 一元购中奖 | PRIZE_WON | 用户在一元购活动中中奖 |
| 发货状态更新 | SHIPPING_UPDATE | 订单发货信息更新 |
| 订单状态变更 | ORDER_UPDATE | 订单状态发生变更 |
| 充值到账 | ACCOUNT | 充值成功到账 |
| 提现完成 | ACCOUNT | 提现申请处理完成 |
| 退款到账 | ACCOUNT | 退款成功到账 |

### 手动发送通知

管理员可通过后台手动发送：

| 发送方式 | 覆盖范围 |
|----------|----------|
| 系统公告 | 全体用户 |
| 单发通知 | 指定用户 |

---

## 示例代码

### JavaScript/TypeScript

```typescript
// 获取通知列表
async function getNotifications(params?: {
  status?: 'UNREAD' | 'READ';
  type?: 'SYSTEM' | 'PRIZE_WON' | 'SHIPPING_UPDATE' | 'ORDER_UPDATE' | 'ACCOUNT' | 'PROMOTION';
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.type) query.set('type', params.type);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.limit) query.set('limit', params.limit.toString());

  const response = await fetch(`/api/v1/notifications?${query}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
}

// 获取未读数量
async function getUnreadCount() {
  const response = await fetch('/api/v1/notifications/unread-count', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
}

// 标记已读
async function markAsRead(notificationIds: number[]) {
  const response = await fetch('/api/v1/notifications/mark-read', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ notificationIds }),
  });

  return await response.json();
}

// 全部标记已读
async function markAllAsRead() {
  const response = await fetch('/api/v1/notifications/mark-all-read', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
}

// 删除通知
async function deleteNotification(id: number) {
  const response = await fetch(`/api/v1/notifications/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
}
```

### React Hook 示例

```typescript
import { useState, useEffect } from 'react';

interface Notification {
  id: number;
  type: string;
  title: string;
  content: string;
  status: 'UNREAD' | 'READ';
  metadata: Record<string, any> | null;
  imageUrl: string | null;
  actionType: string | null;
  actionValue: string | null;
  createdAt: string;
  readAt: string | null;
}

function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // 获取通知列表
  const fetchNotifications = async (status?: 'UNREAD' | 'READ') => {
    setLoading(true);
    try {
      const params = status ? `?status=${status}` : '';
      const response = await fetch(`/api/v1/notifications${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setNotifications(data.items);
    } finally {
      setLoading(false);
    }
  };

  // 获取未读数量
  const fetchUnreadCount = async () => {
    const response = await fetch('/api/v1/notifications/unread-count', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    setUnreadCount(data.count);
  };

  // 标记已读
  const markAsRead = async (notificationIds: number[]) => {
    await fetch('/api/v1/notifications/mark-read', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ notificationIds }),
    });

    // 更新本地状态
    setNotifications(prev =>
      prev.map(n =>
        notificationIds.includes(n.id) ? { ...n, status: 'READ' as const, readAt: new Date().toISOString() } : n
      )
    );
    await fetchUnreadCount();
  };

  // 删除通知
  const deleteNotification = async (id: number) => {
    await fetch(`/api/v1/notifications/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    setNotifications(prev => prev.filter(n => n.id !== id));
    await fetchUnreadCount();
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    deleteNotification,
  };
}
```

---

## 更新日志

### v1.1.0 (2024-02)
- **PRIZE_WON 通知 metadata 增强**
  - 新增 `product` 对象（id, name, image）
  - 新增 `drawRound` 对象（id, roundNumber, totalParticipants）
  - 新增 `result` 对象（winningNumber, prizeType, prizeValue, userTicketCount, winnerUserName）
- **SHIPPING_UPDATE 通知 metadata 增强**
  - 新增 `product` 对象（id, name, image）
  - 新增 `draw` 对象（resultId, roundId, roundNumber）
  - 新增 `logistics` 对象（status, company, trackingNumber）
  - 新增 `prizeValue` 字段

### v1.0.0 (2024-01)
- 初始版本
- 支持获取通知列表
- 支持获取未读数量
- 支持标记已读（单条/批量/全部）
- 支持删除通知
- 支持多种通知类型

---

## 联系方式

如有问题或建议，请联系开发团队。
