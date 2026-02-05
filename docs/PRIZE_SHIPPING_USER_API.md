# 一元购实物奖品发货 - 用户端 API 文档

## 概述

本文档描述用户端实物奖品领取和物流查询的 API 接口。

**Base URL**: `/api/v1/ecommerce/draws`

**认证**: 所有接口需要 JWT 认证（Bearer Token）

---

## 状态说明

### 发货状态 (PrizeShippingStatus)

| 状态值 | 说明 | 用户操作 |
|--------|------|----------|
| `PENDING_ADDRESS` | 待填写地址 | 用户需要提交收货地址 |
| `PENDING_SHIPMENT` | 待发货 | 等待运营发货 |
| `SHIPPED` | 已发货 | 可查看物流信息 |
| `DELIVERED` | 已签收 | 完成 |

---

## API 接口

### 1. 获取我的待领取实物奖品列表

获取当前用户中奖的实物奖品列表。

**请求**

```
GET /prizes/physical/me
```

**Query 参数**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| page | number | 否 | 1 | 页码 |
| limit | number | 否 | 20 | 每页数量 |

**响应示例**

```json
{
  "items": [
    {
      "drawResultId": 123,
      "shippingOrderNumber": "PZ20240125123456",
      "prizeShippingStatus": "PENDING_ADDRESS",
      "product": {
        "id": 1,
        "name": "iPhone 15 Pro",
        "thumbnail": "https://example.com/iphone.jpg"
      },
      "prizeValue": "999.00",
      "roundNumber": 5,
      "winningNumber": 88,
      "createdAt": "2024-01-25T10:30:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20
}
```

---

### 2. 领取实物奖品（提交收货地址）

用户选择收货地址，提交后生成发货订单。

**请求**

```
POST /prizes/physical/:drawResultId/claim
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| drawResultId | number | 中奖结果ID |

**请求体**

```json
{
  "shippingAddressId": 1
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| shippingAddressId | number | 是 | 用户收货地址ID |

**响应示例**

```json
{
  "success": true,
  "drawResultId": 123,
  "shippingOrderNumber": "PZ20240125123456",
  "prizeShippingStatus": "PENDING_SHIPMENT",
  "shippingAddress": {
    "recipientName": "张三",
    "phoneNumber": "138****8888",
    "fullAddress": "中国, 广东省, 深圳市, 南山区科技园xxx号"
  }
}
```

**错误码**

| HTTP 状态码 | 错误说明 |
|-------------|----------|
| 404 | 中奖记录不存在 |
| 400 | 非实物奖品 / 状态不是待填写地址 / 地址不存在 |
| 403 | 无权操作（非中奖用户） |

---

### 3. 获取实物奖品物流信息

获取已提交地址的实物奖品物流详情。

**请求**

```
GET /prizes/physical/:drawResultId/shipping
```

**路径参数**

| 参数 | 类型 | 说明 |
|------|------|------|
| drawResultId | number | 中奖结果ID |

**响应示例**

```json
{
  "drawResultId": 123,
  "shippingOrderNumber": "PZ20240125123456",
  "prizeShippingStatus": "SHIPPED",
  "shippingAddress": {
    "recipientName": "张三",
    "phoneNumber": "138****8888",
    "fullAddress": "中国, 广东省, 深圳市, 南山区科技园xxx号"
  },
  "logisticsInfo": {
    "company": "顺丰速运",
    "trackingNumber": "SF1234567890",
    "shippedAt": "2024-01-26T14:00:00Z",
    "deliveredAt": null
  },
  "timeline": [
    {
      "nodeKey": "PRIZE_PENDING_SHIPMENT",
      "title": "待发货",
      "description": "订单已提交，等待商家发货",
      "activatedAt": "2024-01-25T10:30:00Z"
    },
    {
      "nodeKey": "PRIZE_SHIPPED",
      "title": "已发货",
      "description": "顺丰速运 SF1234567890",
      "activatedAt": "2024-01-26T14:00:00Z"
    },
    {
      "nodeKey": "PRIZE_DELIVERED",
      "title": "已签收",
      "description": "包裹已签收",
      "activatedAt": null
    }
  ]
}
```

**错误码**

| HTTP 状态码 | 错误说明 |
|-------------|----------|
| 404 | 中奖记录不存在 |
| 400 | 非实物奖品 |
| 403 | 无权查看（非中奖用户） |

---

## 前端集成示例

### TypeScript 类型定义

```typescript
// 发货状态
type PrizeShippingStatus =
  | 'PENDING_ADDRESS'    // 待填写地址
  | 'PENDING_SHIPMENT'   // 待发货
  | 'SHIPPED'            // 已发货
  | 'DELIVERED';         // 已签收

// 我的实物奖品列表项
interface MyPhysicalPrize {
  drawResultId: number;
  shippingOrderNumber: string | null;
  prizeShippingStatus: PrizeShippingStatus;
  product: {
    id: number;
    name: string;
    thumbnail: string;
  } | null;
  prizeValue: string;
  roundNumber: number;
  winningNumber: number;
  createdAt: string;
}

// 领取奖品请求
interface ClaimPhysicalPrizeRequest {
  shippingAddressId: number;
}

// 领取奖品响应
interface ClaimPhysicalPrizeResponse {
  success: boolean;
  drawResultId: number;
  shippingOrderNumber: string;
  prizeShippingStatus: PrizeShippingStatus;
  shippingAddress: {
    recipientName: string;
    phoneNumber: string;
    fullAddress: string;
  };
}

// 物流时间线节点
interface LogisticsTimelineNode {
  nodeKey: string;
  title: string;
  description: string;
  activatedAt: string | null;
}

// 物流详情
interface PhysicalPrizeShipping {
  drawResultId: number;
  shippingOrderNumber: string;
  prizeShippingStatus: PrizeShippingStatus;
  shippingAddress: {
    recipientName: string;
    phoneNumber: string;
    fullAddress: string;
  } | null;
  logisticsInfo: {
    company: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
  };
  timeline: LogisticsTimelineNode[];
}
```

### API 调用示例

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1/ecommerce/draws',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// 获取我的实物奖品列表
async function getMyPhysicalPrizes(page = 1, limit = 20) {
  const { data } = await api.get('/prizes/physical/me', {
    params: { page, limit },
  });
  return data;
}

// 领取实物奖品
async function claimPhysicalPrize(
  drawResultId: number,
  shippingAddressId: number
) {
  const { data } = await api.post(
    `/prizes/physical/${drawResultId}/claim`,
    { shippingAddressId }
  );
  return data;
}

// 获取物流信息
async function getPhysicalPrizeShipping(drawResultId: number) {
  const { data } = await api.get(
    `/prizes/physical/${drawResultId}/shipping`
  );
  return data;
}
```

---

## 用户流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户中奖实物奖品                          │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  状态: PENDING_ADDRESS                                          │
│  用户操作: 在「我的奖品」页面选择收货地址，点击「领取」           │
│  调用接口: POST /prizes/physical/:id/claim                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  状态: PENDING_SHIPMENT                                         │
│  用户操作: 等待发货，可查看订单状态                              │
│  调用接口: GET /prizes/physical/:id/shipping                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (运营发货后)
┌─────────────────────────────────────────────────────────────────┐
│  状态: SHIPPED                                                  │
│  用户操作: 查看物流信息，追踪包裹                                │
│  调用接口: GET /prizes/physical/:id/shipping                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼ (运营确认签收后)
┌─────────────────────────────────────────────────────────────────┐
│  状态: DELIVERED                                                │
│  用户操作: 查看历史订单，可发布晒单                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 注意事项

1. **地址快照**: 用户提交地址后，系统会保存地址快照。即使用户后续修改地址，发货仍按提交时的地址进行。

2. **手机号脱敏**: 返回的手机号会进行脱敏处理（如 `138****8888`）。

3. **状态不可逆**: 一旦提交地址，无法修改。如需更改地址，请联系客服。

4. **查询权限**: 用户只能查看自己中奖的奖品物流信息。
