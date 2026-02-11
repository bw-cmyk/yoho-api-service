# Draw Participation Details API + Notification Enhancement

## 实施状态: ✅ 已完成

---

## 需求概述

### 需求一：参与详情 API
新增一个 API 来获取一元购（Lucky Draw）的参与详情，返回：
- 参与记录详情（购买数量、号码范围、花费金额）
- 抽奖轮次信息（商品、总份数、已售、状态）
- 开奖结果（如已开奖：中奖号码、是否中奖）
- 中奖后续状态（如中奖：奖品类型、领取状态、物流信息）

### 需求二：通知 Metadata 增强
在中奖通知和发货通知的 metadata 中加入更丰富的信息：
- 中奖通知: 加入产品信息、轮次信息、中奖结果详情、中奖者名称
- 发货通知: 加入产品信息、轮次信息、物流详情

---

## 已实现的变更

### 1. 参与详情 API

**端点**: `GET /api/v1/ecommerce/draws/participations/:id/detail`

**认证**: JWT 必需

**文件变更**:
- `src/api-modules/ecommerce/dto/draw.dto.ts` - 新增 DTO 类型
- `src/api-modules/ecommerce/services/draw.service.ts` - 新增 `getParticipationDetail()` 方法
- `src/api-modules/ecommerce/controllers/draw.controller.ts` - 新增端点

**响应示例**:
```json
{
  "participationId": 1234567890,
  "orderNumber": "DRAW1707836542ABC",
  "quantity": 10,
  "startNumber": 145,
  "endNumber": 154,
  "ticketNumbers": [145, 146, 147, 148, 149, 150, 151, 152, 153, 154],
  "totalAmount": "1.00",
  "isNewUserChance": false,
  "participatedAt": "2024-02-10T10:30:00Z",

  "drawRound": {
    "id": 5,
    "roundNumber": 1,
    "totalSpots": 1000,
    "soldSpots": 1000,
    "pricePerSpot": "0.10",
    "prizeValue": "899.00",
    "status": "DRAWN",
    "completedAt": "2024-02-10T11:00:00Z",
    "drawnAt": "2024-02-10T12:00:00Z",
    "product": {
      "id": 10,
      "name": "iPhone 15 Pro",
      "imageUrl": "https://...",
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
    "drawnAt": "2024-02-10T12:00:00Z",
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
      "streetAddress": "123 Main St, City, Country"
    }
  }
}
```

---

### 2. 中奖通知增强 (PRIZE_WON)

**文件**: `src/api-modules/notification/services/notification.service.ts`

**新增参数**:
- `productId` - 商品 ID
- `drawRoundId` - 轮次 ID
- `roundNumber` - 轮次号
- `winningNumber` - 中奖号码
- `prizeType` - 奖品类型
- `prizeValue` - 奖品价值
- `totalParticipants` - 总参与人数
- `userTicketCount` - 用户购买的号码数量
- `winnerUserName` - 中奖者名称

**Metadata 结构**:
```json
{
  "drawResultId": 789,
  "product": {
    "id": 10,
    "name": "iPhone 15 Pro",
    "image": "https://..."
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

---

### 3. 发货通知增强 (SHIPPING_UPDATE)

**文件**: `src/api-modules/notification/services/notification.service.ts`

**新增参数**:
- `productId` - 商品 ID
- `productImage` - 商品图片
- `drawResultId` - 中奖记录 ID
- `drawRoundId` - 轮次 ID
- `roundNumber` - 轮次号
- `logisticsCompany` - 物流公司
- `trackingNumber` - 物流单号
- `prizeValue` - 奖品价值

**Metadata 结构**:
```json
{
  "orderId": 456,
  "orderNumber": "ORD1707840000XYZ",
  "product": {
    "id": 10,
    "name": "iPhone 15 Pro",
    "image": "https://..."
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

---

## 变更文件清单

| 文件 | 变更类型 | 描述 |
|------|----------|------|
| `dto/draw.dto.ts` | 新增 | 添加 `ParticipationDetailResponseDto` 及相关子 DTO |
| `services/draw.service.ts` | 修改 | 新增 `getParticipationDetail()` 和 `buildParticipationDetailResponse()` 方法；更新通知调用 |
| `controllers/draw.controller.ts` | 修改 | 新增 `GET /participations/:id/detail` 端点 |
| `notification.service.ts` | 修改 | 增强 `notifyPrizeWon()` 和 `notifyShippingUpdate()` 方法 |
| `logistics.service.ts` | 修改 | 更新发货和签收通知调用，传入更多参数 |

---

## 安全考虑

1. **权限控制**: API 验证 `participation.userId === currentUser.id`，确保用户只能查看自己的参与记录
2. **敏感信息**: 物流地址快照只返回给中奖用户本人
3. **向后兼容**: 通知方法的新增参数均为可选，不影响现有调用

---

## 构建验证

```bash
npm run build  # ✅ 通过
```
