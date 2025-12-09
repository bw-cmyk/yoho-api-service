# 一元购抽奖 API 文档

## 概述

一元购（众筹式抽奖）是一种抽奖玩法，用户通过购买抽奖号码参与，当所有号码售完后进行开奖，中奖者独得全部奖品。

**Base URL**: `/api/v1/ecommerce/draws`

**认证方式**: Bearer Token (JWT)

---

## 目录

- [购买抽奖号码](#1-购买抽奖号码)
- [获取期次列表](#2-获取期次列表)
- [获取期次详情](#3-获取期次详情)
- [获取期次参与记录](#4-获取期次参与记录)
- [获取我的参与记录](#5-获取我的参与记录)
- [手动触发开奖](#6-手动触发开奖管理员)
- [将实物奖品转换为现金](#7-将实物奖品转换为现金)
- [数据模型](#数据模型)
- [错误码说明](#错误码说明)

---

## 1. 购买抽奖号码

购买指定数量的抽奖号码，系统会自动分配连续的号码段。

### 请求

**Endpoint**: `POST /api/v1/ecommerce/draws/purchase`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Body**:
```json
{
  "productId": 1,
  "quantity": 5
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | number | 是 | 商品ID |
| quantity | number | 是 | 购买号码数量，最小值为1 |

### 响应

**成功响应** (200):
```json
{
  "participation": {
    "id": 123,
    "drawRoundId": 45,
    "userId": "373358274021780480",
    "quantity": 5,
    "startNumber": 101,
    "endNumber": 105,
    "totalAmount": "0.50",
    "orderNumber": "DRAW1703123456789ABCDE",
    "timestampSum": 1703123456789,
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "drawRound": {
    "id": 45,
    "productId": 1,
    "roundNumber": 1,
    "totalSpots": 1000,
    "soldSpots": 105,
    "pricePerSpot": "0.10",
    "prizeValue": "250.00",
    "status": "ONGOING",
    "remainingSpots": 895,
    "isFull": false,
    "progressPercentage": 10,
    "completedAt": null,
    "drawnAt": null,
    "autoCreateNext": true,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "orderNumber": "DRAW1703123456789ABCDE"
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "剩余号码不足，仅剩 10 个",
  "error": "Bad Request"
}
```

**错误响应** (400 - 余额不足):
```json
{
  "statusCode": 400,
  "message": "游戏余额不足，请先充值",
  "error": "Bad Request"
}
```

### 业务逻辑

1. 系统会自动获取或创建当前进行中的期次
2. 号码按购买顺序连续分配（如：已售100个，购买5个，则分配101-105）
3. 使用游戏余额（Game Balance）支付
4. 如果期次满员，会自动触发开奖（异步）

---

## 2. 获取期次列表

获取指定商品的所有期次列表。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/rounds`

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| productId | number | 是 | 商品ID | - |
| page | number | 否 | 页码 | 1 |
| limit | number | 否 | 每页数量 | 20 |

**示例**: `GET /api/v1/ecommerce/draws/rounds?productId=1&page=1&limit=20`

### 响应

**成功响应** (200):
```json
{
  "items": [
    {
      "id": 45,
      "productId": 1,
      "roundNumber": 1,
      "totalSpots": 1000,
      "soldSpots": 500,
      "pricePerSpot": "0.10",
      "prizeValue": "250.00",
      "status": "ONGOING",
      "completedAt": null,
      "drawnAt": null,
      "autoCreateNext": true,
      "createdAt": "2024-01-15T08:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "id": 44,
      "productId": 1,
      "roundNumber": 2,
      "totalSpots": 1000,
      "soldSpots": 1000,
      "pricePerSpot": "0.10",
      "prizeValue": "250.00",
      "status": "DRAWN",
      "completedAt": "2024-01-14T20:00:00.000Z",
      "drawnAt": "2024-01-14T20:05:00.000Z",
      "autoCreateNext": true,
      "createdAt": "2024-01-14T08:00:00.000Z",
      "updatedAt": "2024-01-14T20:05:00.000Z"
    }
  ],
  "total": 2,
  "page": 1,
  "limit": 20
}
```

**期次状态说明**:
- `ONGOING`: 进行中
- `COMPLETED`: 已满员，等待开奖
- `DRAWN`: 已开奖
- `CANCELLED`: 已取消

---

## 3. 获取期次详情

获取指定期次的详细信息，包括参与记录和开奖结果。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/rounds/:id`

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 期次ID |

**示例**: `GET /api/v1/ecommerce/draws/rounds/45`

**Headers** (可选):
```
Authorization: Bearer {token}  // 如果提供，会标识当前用户的参与记录
```

### 响应

**成功响应** (200):
```json
{
  "drawRound": {
    "id": 45,
    "productId": 1,
    "roundNumber": 1,
    "totalSpots": 1000,
    "soldSpots": 500,
    "pricePerSpot": "0.10",
    "prizeValue": "250.00",
    "status": "ONGOING",
    "completedAt": null,
    "drawnAt": null,
    "autoCreateNext": true,
    "createdAt": "2024-01-15T08:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "participations": [
    {
      "id": 123,
      "drawRoundId": 45,
      "userId": "373358274021780480",
      "quantity": 5,
      "startNumber": 101,
      "endNumber": 105,
      "totalAmount": "0.50",
      "orderNumber": "DRAW1703123456789ABCDE",
      "timestampSum": 1703123456789,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "result": null  // 如果已开奖，这里会有开奖结果
}
```

**已开奖的期次响应**:
```json
{
  "drawRound": {
    "id": 44,
    "productId": 1,
    "roundNumber": 2,
    "totalSpots": 1000,
    "soldSpots": 1000,
    "pricePerSpot": "0.10",
    "prizeValue": "250.00",
    "status": "DRAWN",
    "completedAt": "2024-01-14T20:00:00.000Z",
    "drawnAt": "2024-01-14T20:05:00.000Z",
    "autoCreateNext": true,
    "createdAt": "2024-01-14T08:00:00.000Z",
    "updatedAt": "2024-01-14T20:05:00.000Z"
  },
  "participations": [...],
  "result": {
    "id": 12,
    "drawRoundId": 44,
    "winningNumber": 567,
    "winnerUserId": "373358274021780480",
    "winnerParticipationId": 120,
    "prizeType": "CASH",
    "prizeValue": "250.00",
    "prizeStatus": "DISTRIBUTED",
    "timestampSum": 1703123456789,
    "blockDistance": 38,
    "targetBlockHeight": 856751,
    "targetBlockHash": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f860160",
    "hashLast6Digits": "860160",
    "completionTime": "2024-01-14T20:00:00.000Z",
    "blockTime": "2024-01-15T08:15:22.000Z",
    "verificationUrl": "https://blockchain.info/block/856751",
    "prizeDistributedAt": "2024-01-14T20:06:00.000Z",
    "createdAt": "2024-01-14T20:05:00.000Z",
    "updatedAt": "2024-01-14T20:06:00.000Z"
  }
}
```

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "期次 999 不存在",
  "error": "Not Found"
}
```

---

## 4. 获取期次参与记录

获取指定期次的所有参与记录（当前未实现，返回空列表）。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/rounds/:id/participations`

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 期次ID |

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | number | 否 | 页码 | 1 |
| limit | number | 否 | 每页数量 | 20 |

### 响应

**成功响应** (200):
```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

> **注意**: 此接口当前未实现，建议使用期次详情接口获取参与记录。

---

## 5. 获取我的参与记录

获取当前用户的所有参与记录。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/participations/me`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| productId | number | 否 | 商品ID（筛选） | - |
| page | number | 否 | 页码 | 1 |
| limit | number | 否 | 每页数量 | 20 |

**示例**: `GET /api/v1/ecommerce/draws/participations/me?productId=1&page=1&limit=20`

### 响应

**成功响应** (200):
```json
{
  "items": [
    {
      "id": 123,
      "drawRoundId": 45,
      "userId": "373358274021780480",
      "quantity": 5,
      "startNumber": 101,
      "endNumber": 105,
      "totalAmount": "0.50",
      "orderNumber": "DRAW1703123456789ABCDE",
      "timestampSum": 1703123456789,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "drawRound": {
        "id": 45,
        "productId": 1,
        "roundNumber": 1,
        "status": "ONGOING",
        "product": {
          "id": 1,
          "name": "0.005 BTC",
          "thumbnail": "https://example.com/images/btc-thumbnail.jpg"
        }
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

## 6. 手动触发开奖（管理员）

手动触发指定期次的开奖（需要管理员权限）。

### 请求

**Endpoint**: `POST /api/v1/ecommerce/draws/rounds/:id/process`

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 期次ID |

**示例**: `POST /api/v1/ecommerce/draws/rounds/45/process`

### 响应

**成功响应** (200):
```json
{
  "id": 12,
  "drawRoundId": 45,
  "winningNumber": 567,
  "winnerUserId": "373358274021780480",
  "winnerParticipationId": 120,
  "prizeType": "CASH",
  "prizeValue": "250.00",
  "prizeStatus": "PENDING",
  "timestampSum": 1703123456789,
  "blockDistance": 38,
  "targetBlockHeight": 856751,
  "targetBlockHash": "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f860160",
  "hashLast6Digits": "860160",
  "completionTime": "2024-01-14T20:00:00.000Z",
  "blockTime": "2024-01-15T08:15:22.000Z",
  "verificationUrl": "https://blockchain.info/block/856751",
  "prizeDistributedAt": null,
  "createdAt": "2024-01-14T20:05:00.000Z",
  "updatedAt": "2024-01-14T20:05:00.000Z"
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "期次尚未满员，无法开奖",
  "error": "Bad Request"
}
```

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "期次 999 不存在",
  "error": "Not Found"
}
```

> **注意**: 
> - 此接口需要管理员权限（当前未实现权限检查，需要添加）
> - 期次必须处于 `COMPLETED` 状态才能开奖
> - 开奖后会自动发放奖品（现金和数字货币）

---

## 7. 将实物奖品转换为现金

将实物奖品转换为等价的现金并发放给中奖用户。

### 请求

**Endpoint**: `POST /api/v1/ecommerce/draws/results/:id/convert-to-cash`

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 开奖结果ID |

**示例**: `POST /api/v1/ecommerce/draws/results/12/convert-to-cash`

### 响应

**成功响应** (200):
```json
{
  "message": "实物奖品已转换为现金并发放",
  "drawResult": {
    "id": 12,
    "prizeType": "CASH",
    "prizeStatus": "DISTRIBUTED",
    "prizeDistributedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "该奖品不是实物奖品，无法转换",
  "error": "Bad Request"
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "奖品已发放，无法转换",
  "error": "Bad Request"
}
```

---

## 数据模型

### DrawRound（期次）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 期次ID |
| productId | number | 商品ID |
| roundNumber | number | 期次编号（从1开始） |
| totalSpots | number | 总号码数 |
| soldSpots | number | 已售号码数 |
| pricePerSpot | string (Decimal) | 每个号码价格 |
| prizeValue | string (Decimal) | 奖品价值 |
| status | enum | 期次状态：ONGOING, COMPLETED, DRAWN, CANCELLED |
| completedAt | string (ISO 8601) \| null | 满员时间 |
| drawnAt | string (ISO 8601) \| null | 开奖时间 |
| autoCreateNext | boolean | 是否自动创建下一期 |
| createdAt | string (ISO 8601) | 创建时间 |
| updatedAt | string (ISO 8601) | 更新时间 |

**计算字段**:
- `remainingSpots`: 剩余号码数 = totalSpots - soldSpots
- `isFull`: 是否已满员 = soldSpots >= totalSpots
- `progressPercentage`: 进度百分比 = (soldSpots / totalSpots) * 100

### DrawParticipation（参与记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 参与记录ID |
| drawRoundId | number | 期次ID |
| userId | string | 用户ID |
| quantity | number | 购买的号码数量 |
| startNumber | number | 起始号码 |
| endNumber | number | 结束号码（包含） |
| totalAmount | string (Decimal) | 总支付金额 |
| orderNumber | string | 关联的订单号 |
| timestampSum | number | 参与时间戳（用于开奖计算） |
| createdAt | string (ISO 8601) | 创建时间 |
| updatedAt | string (ISO 8601) | 更新时间 |

**计算字段**:
- `numbers`: 购买的号码列表数组

### DrawResult（开奖结果）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 开奖结果ID |
| drawRoundId | number | 期次ID |
| winningNumber | number | 中奖号码 |
| winnerUserId | string \| null | 中奖用户ID |
| winnerParticipationId | number \| null | 中奖参与记录ID |
| prizeType | enum | 奖品类型：CASH, CRYPTO, PHYSICAL |
| prizeValue | string (Decimal) | 奖品价值 |
| prizeStatus | enum | 奖品发放状态：PENDING, DISTRIBUTED, CANCELLED |
| timestampSum | number | 所有参与时间戳之和 |
| blockDistance | number | 区块距离 n = (timestampSum最后2位) + 6 |
| targetBlockHeight | number | 目标区块高度 |
| targetBlockHash | string | 目标区块哈希 |
| hashLast6Digits | string | 区块哈希最后6位数字 |
| completionTime | string (ISO 8601) | 满员完成时间 |
| blockTime | string (ISO 8601) | 目标区块时间 |
| verificationUrl | string \| null | 区块链验证链接 |
| prizeDistributedAt | string (ISO 8601) \| null | 奖品发放时间 |
| createdAt | string (ISO 8601) | 创建时间 |
| updatedAt | string (ISO 8601) | 更新时间 |

---

## 错误码说明

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（需要登录） |
| 403 | 无权限（需要管理员权限） |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 常见错误消息

| 错误消息 | 说明 | 解决方案 |
|----------|------|----------|
| 商品类型不匹配 | 商品不是 LUCKY_DRAW 类型 | 检查商品类型 |
| 当前期次不可购买 | 期次状态不允许购买 | 检查期次状态 |
| 剩余号码不足 | 剩余号码数小于购买数量 | 减少购买数量 |
| 游戏余额不足，请先充值 | 用户游戏余额不足 | 充值后再购买 |
| 期次尚未满员，无法开奖 | 期次未满员 | 等待期次满员 |
| 期次 {id} 不存在 | 期次不存在 | 检查期次ID |

---

## 开奖算法说明

### 计算公式

1. **计算区块距离**:
   ```
   n = Sum of All Timestamps (Last 2 Digits) + 6
   ```

2. **查找目标区块**:
   - 从满员完成时间往前推 n 个区块

3. **提取区块哈希**:
   - 从目标区块哈希中提取最后6位数字（非字母）

4. **计算中奖号码**:
   ```
   Winner = (Block n Hash Last 6 Digits % Total) + 1
   ```

### 验证

所有开奖结果都包含：
- 目标区块高度和哈希
- 区块验证链接（blockchain.info）
- 完整的计算过程

用户可以通过区块链浏览器独立验证开奖结果的公平性。

---

## 支付说明

### 支付方式

一元购使用**游戏余额（Game Balance）**支付：
- 游戏余额 = 真实余额（balanceReal）+ 赠金余额（balanceBonus）
- 优先使用赠金余额，不足部分使用真实余额

### 余额不足处理

如果游戏余额不足：
1. 返回错误：`游戏余额不足，请先充值`
2. 前端引导用户从现金余额划转到游戏余额

---

## 定时任务

系统包含以下定时任务：

1. **处理已满员但未开奖的期次**
   - 执行频率：每分钟
   - 功能：自动触发开奖

2. **发放待发放的奖品**
   - 执行频率：每5分钟
   - 功能：自动发放现金和数字货币奖品

---

## 示例代码

### JavaScript/TypeScript

```typescript
// 购买抽奖号码
async function purchaseSpots(productId: number, quantity: number) {
  const response = await fetch('/api/v1/ecommerce/draws/purchase', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      productId,
      quantity,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }
  
  return await response.json();
}

// 获取期次详情
async function getRoundDetail(roundId: number) {
  const response = await fetch(`/api/v1/ecommerce/draws/rounds/${roundId}`);
  return await response.json();
}

// 获取我的参与记录
async function getMyParticipations(productId?: number) {
  let url = '/api/v1/ecommerce/draws/participations/me?page=1&limit=20';
  if (productId) {
    url += `&productId=${productId}`;
  }
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return await response.json();
}
```

---

## 更新日志

### v1.0.0 (2024-01-15)
- 初始版本
- 支持购买抽奖号码
- 支持期次查询
- 支持自动开奖
- 支持奖品自动发放

---

## 联系方式

如有问题或建议，请联系开发团队。

