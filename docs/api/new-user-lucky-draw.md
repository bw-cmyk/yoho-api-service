# 新用户抽奖 API 文档

**Base URL**: `/api/v1/ecommerce/draws`

## 概述

新用户抽奖是为首次参与抽奖的用户提供的福利功能。新用户可以获得一次免费抽奖机会，中奖后还可获得额外奖励。

### 新用户福利

| 项目 | 值 |
|------|-----|
| 机会价值 | 0.1 USD |
| 中奖奖励 | 额外 0.5 USD |
| 有效期 | 10 分钟 |
| 参与费用 | 免费 (不扣余额) |

### 状态流转

```
PENDING → CLAIMED → USED
    ↓
  EXPIRED (10分钟后自动)
```

---

## API 接口

### 1. 获取新用户抽奖机会状态

获取当前用户的新用户抽奖机会状态。首次调用会自动创建抽奖机会。

**请求**

```
GET /new-user/status
```

**Headers**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Authorization | string | 是 | Bearer token |

**响应**

```json
{
  "hasChance": true,
  "chance": {
    "id": 1,
    "status": "PENDING",
    "chanceAmount": "0.1",
    "bonusAmount": "0.5",
    "expiresAt": "2026-01-27T12:10:00.000Z",
    "remainingSeconds": 580
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| hasChance | boolean | 是否有可用的抽奖机会 |
| chance.id | number | 机会ID |
| chance.status | string | 状态: `PENDING` / `CLAIMED` / `USED` / `EXPIRED` |
| chance.chanceAmount | string | 抽奖价值 (USD) |
| chance.bonusAmount | string | 中奖额外奖励 (USD) |
| chance.expiresAt | string | 过期时间 (ISO 8601) |
| chance.remainingSeconds | number | 剩余有效秒数 |

---

### 2. 领取新用户抽奖机会

领取抽奖机会，将状态从 `PENDING` 变为 `CLAIMED`。

**请求**

```
POST /new-user/claim
```

**Headers**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Authorization | string | 是 | Bearer token |

**响应**

```json
{
  "id": 1,
  "status": "CLAIMED",
  "chanceAmount": "0.1",
  "bonusAmount": "0.5",
  "expiresAt": "2026-01-27T12:10:00.000Z",
  "remainingSeconds": 520
}
```

**错误响应**

| HTTP 状态码 | 错误说明 |
|------------|---------|
| 400 | 机会已过期 |
| 400 | 机会已被使用 |
| 404 | 用户没有抽奖机会 |

---

### 3. 使用新用户机会参与抽奖

使用已领取的抽奖机会参与抽奖，免费获得一个抽奖名额。

**请求**

```
POST /new-user/use
```

**Headers**

| 名称 | 类型 | 必填 | 说明 |
|------|------|------|------|
| Authorization | string | 是 | Bearer token |

**Body**

```json
{
  "productId": 123
}
```

**请求参数**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| productId | number | 否 | 指定参与的商品ID，不传则自动选择 |

**响应**

```json
{
  "participation": {
    "id": 456,
    "drawRoundId": 789,
    "userId": "user-uuid",
    "productId": 123,
    "quantity": 1,
    "startNumber": 5,
    "endNumber": 5,
    "totalAmount": "0.00",
    "orderNumber": "ORD-xxx",
    "isNewUserChance": true
  },
  "round": {
    "id": 789,
    "productId": 123,
    "roundNumber": 1,
    "totalSpots": 100,
    "soldSpots": 50,
    "pricePerSpot": "0.1",
    "prizeValue": "10.00",
    "status": "ONGOING"
  }
}
```

**响应字段说明**

| 字段 | 类型 | 说明 |
|------|------|------|
| participation.id | number | 参与记录ID |
| participation.drawRoundId | number | 抽奖轮次ID |
| participation.quantity | number | 获得的名额数量 |
| participation.startNumber | number | 起始号码 |
| participation.endNumber | number | 结束号码 |
| participation.totalAmount | string | 支付金额 (新用户为 0) |
| participation.isNewUserChance | boolean | 是否为新用户机会 |
| round.id | number | 抽奖轮次ID |
| round.totalSpots | number | 总名额数 |
| round.soldSpots | number | 已售名额数 |
| round.prizeValue | string | 奖品价值 |
| round.status | string | 轮次状态 |

**错误响应**

| HTTP 状态码 | 错误说明 |
|------------|---------|
| 400 | 机会未领取 |
| 400 | 机会已被使用 |
| 400 | 机会已过期 |
| 404 | 无可参与的抽奖轮次 |

---

## 使用流程

1. **获取状态**: 调用 `GET /new-user/status` 检查是否有抽奖机会
2. **领取机会**: 调用 `POST /new-user/claim` 领取抽奖机会
3. **参与抽奖**: 调用 `POST /new-user/use` 使用机会参与抽奖
4. **等待开奖**: 抽奖轮次满员后自动开奖
5. **中奖奖励**: 如果中奖，除正常奖品外还会获得 0.5 USD 额外奖励

## 注意事项

- 每个用户仅有一次新用户抽奖机会
- 机会有效期为 10 分钟，过期后无法使用
- 必须先领取 (`claim`) 才能使用 (`use`)
- 新用户参与不扣除账户余额
- 中奖后额外奖励会自动发放到账户
