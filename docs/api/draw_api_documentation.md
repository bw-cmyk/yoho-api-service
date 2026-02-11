# 一元购抽奖 API 文档

## 概述

一元购（众筹式抽奖）是一种抽奖玩法，用户通过购买抽奖号码参与，当所有号码售完后进行开奖，中奖者独得全部奖品。

**Base URL**: `/api/v1/ecommerce/draws`

**认证方式**: Bearer Token (JWT)

---

## 目录

- [购买抽奖号码](#1-购买抽奖号码)
- [获取期次列表](#2-获取期次列表)
- [获取所有进行中的期次](#3-获取所有进行中的期次)
- [获取当前期次详情](#4-获取当前期次详情)
- [获取期次详情](#5-获取期次详情)
- [获取期次参与记录](#6-获取期次参与记录)
- [获取我的参与记录](#7-获取我的参与记录)
- [获取参与详情](#8-获取参与详情)
- [获取我的中奖记录](#9-获取我的中奖记录)
- [领取实物奖品（提交收货地址）](#10-领取实物奖品提交收货地址)
- [获取实物奖品订单详情](#11-获取实物奖品订单详情)
- [手动触发开奖](#12-手动触发开奖管理员)
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

## 3. 获取所有进行中的期次

获取所有商品的进行中期次列表，用于首页展示。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/rounds/ongoing`

**示例**: `GET /api/v1/ecommerce/draws/rounds/ongoing`

### 响应

**成功响应** (200):
```json
[
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
    "id": 46,
    "productId": 2,
    "roundNumber": 3,
    "totalSpots": 500,
    "soldSpots": 200,
    "pricePerSpot": "0.10",
    "prizeValue": "50.00",
    "status": "ONGOING",
    "completedAt": null,
    "drawnAt": null,
    "autoCreateNext": true,
    "createdAt": "2024-01-15T09:00:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
]
```

**说明**:
- 返回所有状态为 `ONGOING` 的期次
- 适用于首页展示多个商品的当前期次
- 无需认证，公开接口

---

## 4. 获取当前期次详情

获取指定商品的当前进行中期次详情。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/rounds/ongoing/detail`

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | number | 是 | 商品ID |

**示例**: `GET /api/v1/ecommerce/draws/rounds/ongoing/detail?productId=1`

### 响应

**成功响应** (200):
```json
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
}
```

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "当前没有进行中的期次",
  "error": "Not Found"
}
```

**说明**:
- 返回指定商品的当前进行中期次
- 如果商品没有进行中的期次，返回 404
- 无需认证，公开接口
- 适用于商品详情页展示当前期次信息

---

## 5. 获取期次详情

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

## 6. 获取期次参与记录

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

## 7. 获取我的参与记录

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

## 8. 获取参与详情

获取用户指定参与记录的完整详情，包括轮次信息、开奖结果、物流状态等。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/participations/:id/detail`

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| id | number | 是 | 参与记录ID |

**示例**: `GET /api/v1/ecommerce/draws/participations/123/detail`

### 响应

**成功响应** (200):
```json
{
  "participationId": 123,
  "orderNumber": "DRAW1707836542ABC",
  "quantity": 10,
  "startNumber": 145,
  "endNumber": 154,
  "ticketNumbers": [145, 146, 147, 148, 149, 150, 151, 152, 153, 154],
  "totalAmount": "1.00",
  "isNewUserChance": false,
  "participatedAt": "2024-02-10T10:30:00.000Z",

  "drawRound": {
    "id": 5,
    "roundNumber": 1,
    "totalSpots": 1000,
    "soldSpots": 1000,
    "pricePerSpot": "0.10",
    "prizeValue": "899.00",
    "status": "DRAWN",
    "completedAt": "2024-02-10T11:00:00.000Z",
    "drawnAt": "2024-02-10T12:00:00.000Z",
    "product": {
      "id": 10,
      "name": "iPhone 15 Pro",
      "imageUrl": "https://example.com/images/iphone15.jpg",
      "prizeType": "PHYSICAL"
    }
  },

  "drawResult": {
    "id": 789,
    "winningNumber": 150,
    "isWinner": true,
    "prizeType": "PHYSICAL",
    "prizeValue": "899.00",
    "prizeStatus": "PENDING",
    "drawnAt": "2024-02-10T12:00:00.000Z",
    "verification": {
      "targetBlockHeight": 880123,
      "targetBlockHash": "0000000000000000000234abc...",
      "hashLast6Digits": "000150",
      "verificationUrl": "https://mempool.space/block/880123"
    }
  },

  "prizeOrder": {
    "orderId": 456,
    "orderNumber": "ORD1707840000XYZ",
    "shippingStatus": "SHIPPED",
    "logisticsCompany": "SF Express",
    "trackingNumber": "SF1234567890",
    "deliveredAt": null,
    "shippingAddress": {
      "recipientName": "John Doe",
      "phoneNumber": "+1234567890",
      "country": "United States",
      "state": "California",
      "city": "San Francisco",
      "streetAddress": "123 Main St"
    }
  }
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| participationId | number | 参与记录ID |
| orderNumber | string | 参与订单号 |
| quantity | number | 购买的号码数量 |
| startNumber | number | 起始号码 |
| endNumber | number | 结束号码（包含） |
| ticketNumbers | number[] | 所有号码列表 |
| totalAmount | string | 总支付金额 |
| isNewUserChance | boolean | 是否为新用户抽奖机会 |
| participatedAt | string | 参与时间 |
| drawRound | object | 轮次信息 |
| drawResult | object \| null | 开奖结果（如已开奖） |
| prizeOrder | object \| null | 奖品订单（如中奖且为实物奖品） |

**drawRound 字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 轮次ID |
| roundNumber | number | 轮次编号 |
| totalSpots | number | 总号码数 |
| soldSpots | number | 已售号码数 |
| pricePerSpot | string | 每个号码价格 |
| prizeValue | string | 奖品价值 |
| status | string | 轮次状态：ONGOING, COMPLETED, DRAWN, CANCELLED |
| completedAt | string \| null | 售罄时间 |
| drawnAt | string \| null | 开奖时间 |
| product | object | 商品信息 |

**drawResult 字段说明**（仅当已开奖时存在）:

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 开奖结果ID |
| winningNumber | number | 中奖号码 |
| isWinner | boolean | 当前用户是否中奖 |
| prizeType | string | 奖品类型：CASH, CRYPTO, PHYSICAL |
| prizeValue | string | 奖品价值 |
| prizeStatus | string | 奖品状态：PENDING, DISTRIBUTED, CANCELLED |
| drawnAt | string | 开奖时间 |
| verification | object \| null | 区块链验证信息 |

**prizeOrder 字段说明**（仅当中奖且为实物奖品时存在）:

| 字段 | 类型 | 说明 |
|------|------|------|
| orderId | number | 订单ID |
| orderNumber | string | 订单号 |
| shippingStatus | string | 发货状态：PENDING, PENDING_SHIPMENT, SHIPPED, DELIVERED |
| logisticsCompany | string \| null | 物流公司 |
| trackingNumber | string \| null | 物流单号 |
| deliveredAt | string \| null | 签收时间 |
| shippingAddress | object \| null | 收货地址快照 |

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "Participation not found",
  "error": "Not Found"
}
```

**说明**:
- 只能查看自己的参与记录
- 如果轮次尚未开奖，`drawResult` 为 null
- 如果用户未中奖或奖品非实物，`prizeOrder` 为 null
- 收货地址信息只对中奖用户本人可见

---

## 9. 获取我的中奖记录

获取当前用户的所有中奖记录（实物奖品）。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/my-wins`

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:

| 参数 | 类型 | 必填 | 说明 | 默认值 |
|------|------|------|------|--------|
| page | number | 否 | 页码 | 1 |
| limit | number | 否 | 每页数量 | 20 |

**示例**: `GET /api/v1/ecommerce/draws/my-wins?page=1&limit=20`

### 响应

**成功响应** (200):
```json
{
  "items": [
    {
      "drawResultId": 1,
      "drawRoundId": 1,
      "winningNumber": 4,
      "product": {
        "id": 2,
        "name": "0.005 BTC",
        "thumbnail": "https://example.com/images/btc-thumbnail.jpg"
      },
      "prizeValue": "500.00",
      "prizeStatus": "PENDING",
      "prizeShippingStatus": "PENDING_ADDRESS",
      "addressSubmittedAt": null,
      "orderId": null,
      "createdAt": "2025-12-12T03:37:28.638Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| drawResultId | number | 中奖记录ID |
| drawRoundId | number | 期次ID |
| winningNumber | number | 中奖号码 |
| product | object | 商品信息 |
| prizeValue | string | 奖品价值（USD） |
| prizeStatus | enum | 奖品状态：PENDING（待发放）、DISTRIBUTED（已发放）、CANCELLED（已取消） |
| prizeShippingStatus | enum | 发货状态：PENDING_ADDRESS（待填写地址）、PENDING_SHIPMENT（待发货）、SHIPPED（已发货）、DELIVERED（已签收） |
| addressSubmittedAt | string \| null | 地址提交时间 |
| orderId | number \| null | 订单ID（已提交地址后创建） |
| createdAt | string | 中奖时间 |

**说明**:
- 只返回实物奖品（`prizeType = PHYSICAL`）的中奖记录
- 按中奖时间倒序排列
- 用于用户查看自己的中奖记录并提交收货地址

---

## 9. 领取实物奖品（提交收货地址）

提交收货地址并创建订单，用于领取实物奖品。

### 请求

**Endpoint**: `POST /api/v1/ecommerce/draws/prizes/physical/:drawResultId/claim`

**Headers**:
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| drawResultId | number | 是 | 中奖记录ID |

**Body**:
```json
{
  "shippingAddressId": 8
}
```

**参数说明**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| shippingAddressId | number | 是 | 收货地址ID（用户预先保存的地址） |

**示例**: `POST /api/v1/ecommerce/draws/prizes/physical/1/claim`

### 响应

**成功响应** (200):
```json
{
  "drawResult": {
    "id": 1,
    "drawRoundId": 1,
    "winningNumber": 4,
    "winnerUserId": "358801635322889216",
    "winnerUserName": "Jilian",
    "prizeType": "PHYSICAL",
    "prizeValue": "500",
    "prizeStatus": "PENDING",
    "orderId": 8,
    "addressSubmittedAt": "2026-02-09T09:22:09.849Z"
  },
  "order": {
    "id": 8,
    "orderNumber": "ORD1770628929609H7Z2R4",
    "userId": "358801635322889216",
    "type": "LUCKY_DRAW",
    "productId": 2,
    "productInfo": {
      "name": "0.005 BTC",
      "thumbnail": "https://example.com/images/btc-thumbnail.jpg"
    },
    "paymentAmount": "0",
    "paymentStatus": "PAID",
    "prizeShippingStatus": "PENDING_SHIPMENT",
    "drawResultId": 1,
    "shippingAddressId": 8,
    "createdAt": "2026-02-09T01:22:09.720Z"
  }
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "该奖品不是实物奖品",
  "error": "Bad Request"
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "奖品不属于当前用户",
  "error": "Bad Request"
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "已提交过收货地址",
  "error": "Bad Request"
}
```

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "收货地址不存在",
  "error": "Not Found"
}
```

### 业务逻辑

1. 验证中奖记录是否属于当前用户
2. 验证是否为实物奖品
3. 验证是否已提交过收货地址
4. 创建 LUCKY_DRAW 类型的订单（paymentAmount = 0, paymentStatus = PAID）
5. 初始化物流时间线（3个节点：待发货、已发货、已签收）
6. 更新 DrawResult 的 orderId 和 addressSubmittedAt

**重要说明**:
- 收货地址需要用户预先保存（通过地址管理接口）
- 一个奖品只能提交一次收货地址
- 订单金额为 0，支付状态为已支付
- 订单类型为 LUCKY_DRAW，与即时购买订单共享同一个 Order 系统

---

## 10. 获取实物奖品订单详情

获取实物奖品的订单详情和物流信息。

### 请求

**Endpoint**: `GET /api/v1/ecommerce/draws/prizes/physical/:drawResultId/order`

**Headers**:
```
Authorization: Bearer {token}
```

**Path Parameters**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| drawResultId | number | 是 | 中奖记录ID |

**示例**: `GET /api/v1/ecommerce/draws/prizes/physical/1/order`

### 响应

**成功响应** (200):
```json
{
  "orderId": 8,
  "orderNumber": "ORD1770628929609H7Z2R4",
  "prizeShippingStatus": "PENDING_SHIPMENT",
  "prizeStatus": "PENDING",
  "drawRoundId": 1,
  "roundNumber": 1,
  "winningNumber": 4,
  "product": {
    "id": 2,
    "name": "0.005 BTC",
    "thumbnail": "https://example.com/images/btc-thumbnail.jpg",
    "images": [
      "https://example.com/images/btc-thumbnail.jpg"
    ]
  },
  "winner": {
    "userId": "358801635322889216",
    "userName": "Jilian",
    "avatar": null
  },
  "shippingAddress": {
    "recipientName": "John Doe",
    "phoneNumber": "+1234567890",
    "country": "United States",
    "state": "California",
    "city": "San Francisco",
    "streetAddress": "123 Main St",
    "apartment": "Apt 4B",
    "zipCode": "94102"
  },
  "logistics": {
    "company": null,
    "trackingNumber": null,
    "deliveredAt": null
  },
  "timeline": [
    {
      "event": "WON",
      "title": "Won Prize",
      "time": "2025-12-12T03:37:28.638Z"
    },
    {
      "event": "ADDRESS_SUBMITTED",
      "title": "Address Submitted",
      "time": "2026-02-09T09:22:09.849Z"
    }
  ],
  "prizeValue": "500",
  "addressSubmittedAt": "2026-02-09T09:22:09.849Z",
  "createdAt": "2025-12-12T03:37:28.638Z"
}
```

**错误响应** (400):
```json
{
  "statusCode": 400,
  "message": "奖品尚未提交收货地址",
  "error": "Bad Request"
}
```

**错误响应** (404):
```json
{
  "statusCode": 404,
  "message": "中奖记录不存在",
  "error": "Not Found"
}
```

**字段说明**:

| 字段 | 类型 | 说明 |
|------|------|------|
| orderId | number | 订单ID |
| orderNumber | string | 订单号 |
| prizeShippingStatus | enum | 发货状态 |
| prizeStatus | enum | 奖品状态 |
| drawRoundId | number | 期次ID |
| roundNumber | number | 期次编号 |
| winningNumber | number | 中奖号码 |
| product | object | 商品信息 |
| winner | object | 中奖用户信息 |
| shippingAddress | object | 收货地址信息 |
| logistics | object | 物流信息 |
| timeline | array | 订单时间线 |
| prizeValue | string | 奖品价值 |
| addressSubmittedAt | string | 地址提交时间 |
| createdAt | string | 创建时间 |

**物流时间线事件类型**:

| 事件 | 说明 |
|------|------|
| WON | 中奖 |
| ADDRESS_SUBMITTED | 已提交地址 |
| SHIPPED | 已发货（管理员操作） |
| DELIVERED | 已签收（管理员操作） |

**说明**:
- 只有提交收货地址后才能查看订单详情
- 返回完整的物流时间线
- 包含收货地址和物流信息

---

## 11. 手动触发开奖（管理员）

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

**新增字段（Order-based 系统）**:

| 字段 | 类型 | 说明 |
|------|------|------|
| orderId | number \| null | 关联的订单ID（实物奖品提交地址后创建） |
| addressSubmittedAt | string \| null | 收货地址提交时间 |

### Order（订单）

实物奖品提交收货地址后，会创建一个 LUCKY_DRAW 类型的订单。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | number | 订单ID |
| orderNumber | string | 订单号（格式：ORD{timestamp}{random}） |
| userId | string | 用户ID |
| type | enum | 订单类型：INSTANT_BUY（即时购买）、LUCKY_DRAW（一元购奖品） |
| productId | number | 商品ID |
| productInfo | object | 商品信息快照（包含 name, thumbnail, images 等） |
| quantity | number | 数量（一元购奖品固定为 1） |
| paymentAmount | string (Decimal) | 支付金额（一元购奖品固定为 0） |
| paymentStatus | enum | 支付状态：一元购奖品固定为 PAID |
| prizeShippingStatus | enum \| null | 奖品发货状态（仅 LUCKY_DRAW 订单） |
| drawResultId | number \| null | 关联的中奖记录ID（仅 LUCKY_DRAW 订单） |
| shippingAddressId | number \| null | 收货地址ID |
| logisticsCompany | string \| null | 物流公司 |
| trackingNumber | string \| null | 物流单号 |
| deliveredAt | string \| null | 签收时间 |
| createdAt | string (ISO 8601) | 创建时间 |
| updatedAt | string (ISO 8601) | 更新时间 |

### PrizeShippingStatus（奖品发货状态）

| 状态 | 说明 |
|------|------|
| PENDING_ADDRESS | 待填写地址（用户未提交收货地址） |
| PENDING_SHIPMENT | 待发货（已提交地址，等待管理员发货） |
| SHIPPED | 已发货（管理员已填写物流信息） |
| DELIVERED | 已签收（管理员确认签收） |

### 物流时间线节点

一元购实物奖品的物流时间线包含以下 3 个节点：

| 节点键 | 名称 | 说明 |
|--------|------|------|
| PRIZE_PENDING_SHIPMENT | Pending Shipment | 提交地址后立即激活 |
| PRIZE_SHIPPED | Shipped | 管理员发货时激活 |
| PRIZE_DELIVERED | Delivered | 管理员确认签收时激活 |

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
| 该奖品不是实物奖品 | 尝试对非实物奖品操作 | 检查奖品类型 |
| 奖品不属于当前用户 | 尝试操作他人的奖品 | 检查登录状态 |
| 已提交过收货地址 | 重复提交地址 | 检查订单状态 |
| 收货地址不存在 | 地址ID无效 | 检查地址是否已删除 |
| 奖品尚未提交收货地址 | 尝试查看未提交地址的订单 | 先提交收货地址 |

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

// 获取所有进行中的期次
async function getAllOngoingRounds() {
  const response = await fetch('/api/v1/ecommerce/draws/rounds/ongoing');
  return await response.json();
}

// 获取当前期次详情
async function getOngoingRoundDetail(productId: number) {
  const response = await fetch(
    `/api/v1/ecommerce/draws/rounds/ongoing/detail?productId=${productId}`,
  );
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

// 获取我的中奖记录（实物奖品）
async function getMyWins() {
  const response = await fetch('/api/v1/ecommerce/draws/my-wins?page=1&limit=20', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return await response.json();
}

// 领取实物奖品（提交收货地址）
async function claimPhysicalPrize(drawResultId: number, shippingAddressId: number) {
  const response = await fetch(
    `/api/v1/ecommerce/draws/prizes/physical/${drawResultId}/claim`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        shippingAddressId,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return await response.json();
}

// 获取实物奖品订单详情
async function getPhysicalPrizeOrder(drawResultId: number) {
  const response = await fetch(
    `/api/v1/ecommerce/draws/prizes/physical/${drawResultId}/order`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }
  );

  return await response.json();
}
```

**完整示例流程**：

```typescript
// 1. 获取用户的中奖记录
const wins = await getMyWins();

// 2. 对于未提交地址的奖品，提交收货地址
for (const win of wins.items) {
  if (win.prizeShippingStatus === 'PENDING_ADDRESS') {
    // 假设用户已经保存了收货地址，ID 为 8
    const result = await claimPhysicalPrize(win.drawResultId, 8);
    console.log('订单创建成功:', result.order.orderNumber);
  }
}

// 3. 查看订单详情
const orderDetail = await getPhysicalPrizeOrder(1);
console.log('发货状态:', orderDetail.prizeShippingStatus);
console.log('物流信息:', orderDetail.logistics);
```

---

## 更新日志

### v2.0.0 (2026-02-09)
- **重大更新**：实物奖品发货系统改用 Order-based 架构
- 新增：获取我的中奖记录接口
- 新增：提交收货地址并创建订单接口
- 新增：获取实物奖品订单详情接口
- 实物奖品与即时购买订单共享同一个 Order 系统
- 支持物流时间线跟踪（3个节点）
- 移除：将实物奖品转换为现金功能（改用实物发货）

### v1.0.0 (2024-01-15)
- 初始版本
- 支持购买抽奖号码
- 支持期次查询
- 支持自动开奖
- 支持奖品自动发放

---

## 联系方式

如有问题或建议，请联系开发团队。

