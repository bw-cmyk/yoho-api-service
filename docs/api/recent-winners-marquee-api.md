# 中奖跑马灯 API 文档

## 功能概述

提供最近中奖记录列表，用于前端跑马灯展示。显示格式如：
```
Congrats Mike_investor won $200 Gift Card • $200
```

## API 端点

### 获取最近中奖记录

**端点**: `GET /api/v1/ecommerce/draws/recent-winners`

**认证**: 无需认证（公开端点）

**查询参数**:
| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| limit | number | 否 | 50 | 返回记录数量，最大100 |

**请求示例**:
```bash
# 获取最近50条中奖记录（默认）
curl -X GET "http://localhost:3001/api/v1/ecommerce/draws/recent-winners"

# 获取最近20条中奖记录
curl -X GET "http://localhost:3001/api/v1/ecommerce/draws/recent-winners?limit=20"
```

**响应格式**:
```typescript
Array<{
  winnerUserName: string;          // 中奖用户名
  winnerUserAvatar: string | null; // 中奖用户头像URL
  prizeType: 'CASH' | 'CRYPTO' | 'PHYSICAL'; // 奖品类型
  prizeValue: string;              // 奖品价值（USD）
  prizeInfo: string;               // 奖品描述
  productId: number;               // 商品ID
  productName: string;             // 商品名称
  wonAt: Date;                     // 中奖时间
}>
```

**响应示例**:
```json
[
  {
    "winnerUserName": "Mike_investor",
    "winnerUserAvatar": "https://example.com/avatar1.jpg",
    "prizeType": "PHYSICAL",
    "prizeValue": "200.00",
    "prizeInfo": "$200 Gift Card",
    "productId": 1,
    "productName": "Amazon Gift Card",
    "wonAt": "2025-01-28T10:30:00.000Z"
  },
  {
    "winnerUserName": "crypto_whale",
    "winnerUserAvatar": "https://example.com/avatar2.jpg",
    "prizeType": "CRYPTO",
    "prizeValue": "500.00",
    "prizeInfo": "$500.00 USDT",
    "productId": 2,
    "productName": "USDT Draw",
    "wonAt": "2025-01-28T09:15:00.000Z"
  },
  {
    "winnerUserName": "lucky_user",
    "winnerUserAvatar": null,
    "prizeType": "CASH",
    "prizeValue": "100.00",
    "prizeInfo": "$100.00 Cash Prize",
    "productId": 3,
    "productName": "Cash Prize Draw",
    "wonAt": "2025-01-28T08:45:00.000Z"
  }
]
```

## 奖品信息格式规则

根据 `prizeType` 自动生成 `prizeInfo`：

- **CASH**: `$XXX.XX Cash Prize`
- **CRYPTO**: `$XXX.XX USDT`
- **PHYSICAL**: 使用商品名称（`productName`），如 `$200 Gift Card`

## 前端集成示例

### React 跑马灯组件

```tsx
import { useEffect, useState } from 'react';
import axios from 'axios';

interface WinnerRecord {
  winnerUserName: string;
  winnerUserAvatar: string | null;
  prizeType: string;
  prizeValue: string;
  prizeInfo: string;
  wonAt: string;
}

export function WinnerMarquee() {
  const [winners, setWinners] = useState<WinnerRecord[]>([]);

  useEffect(() => {
    const fetchWinners = async () => {
      const response = await axios.get(
        '/api/v1/ecommerce/draws/recent-winners?limit=50'
      );
      setWinners(response.data);
    };

    fetchWinners();
    // 每分钟刷新一次
    const interval = setInterval(fetchWinners, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="marquee-container">
      <div className="marquee-content">
        {winners.map((winner, index) => (
          <div key={index} className="winner-item">
            <span className="congrats">Congrats</span>
            <span className="username">{winner.winnerUserName}</span>
            <span className="won">won</span>
            <span className="prize-info">{winner.prizeInfo}</span>
            <span className="separator">•</span>
            <span className="prize-value">${winner.prizeValue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### CSS 样式示例

```css
.marquee-container {
  width: 100%;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a1a, #2d2d2d);
  padding: 16px 0;
  border-radius: 8px;
}

.marquee-content {
  display: flex;
  animation: marquee 60s linear infinite;
  white-space: nowrap;
}

.winner-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 24px;
  font-size: 16px;
  color: white;
}

.congrats {
  font-weight: 600;
}

.username {
  color: #60a5fa;
  font-weight: 600;
}

.prize-info {
  color: #f87171;
  font-weight: 700;
}

.prize-value {
  color: #fbbf24;
  font-weight: 700;
  font-size: 18px;
}

.separator {
  color: #9ca3af;
}

@keyframes marquee {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}
```

## 数据说明

### 数据来源
- 从 `yoho_ecommerce_draw_results` 表查询最近的中奖记录
- 关联 `yoho_ecommerce_draw_rounds` 获取期次信息
- 关联 `yoho_ecommerce_products` 获取商品信息

### 数据过滤
- 只返回有中奖者的记录（`winner_user_id IS NOT NULL`）
- 按创建时间倒序排列
- 最多返回100条记录

### 性能考虑
- 使用索引查询，性能高效
- 建议前端缓存结果，每分钟或数分钟刷新一次
- 可考虑在后端添加Redis缓存（TTL: 1分钟）

## 测试

### 手动测试
```bash
# 1. 启动开发服务器
npm run start:dev

# 2. 测试API
curl -X GET "http://localhost:3001/api/v1/ecommerce/draws/recent-winners?limit=10"

# 3. 验证响应格式
# 应该返回JSON数组，包含最近的中奖记录
```

### 预期结果
- 返回数组，最多包含指定数量的中奖记录
- 按时间倒序排列（最新的在前）
- 每条记录包含完整的字段信息
- 匿名用户显示为 "Anonymous"

## Swagger 文档

启动服务后，访问 `/docs` 可查看Swagger API文档：
```
http://localhost:3001/docs#/一元购抽奖/DrawController_getRecentWinners
```

## 扩展建议

### WebSocket 实时推送（可选）
如果需要实时更新，可以考虑添加WebSocket推送：
```typescript
// 在 draw.service.ts 的 processDraw() 方法中
// 开奖后推送新的中奖记录
this.websocketGateway.emit('newWinner', {
  winnerUserName: result.winnerUserName,
  prizeInfo: result.prizeInfo,
  prizeValue: result.prizeValue,
});
```

### Redis 缓存（推荐）
添加1分钟缓存，减少数据库查询：
```typescript
async getRecentWinners(limit: number = 50) {
  const cacheKey = `recent_winners:${limit}`;
  const cached = await redisClient.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  const results = await this.drawResultRepository
    .createQueryBuilder('result')
    // ... 查询逻辑

  await redisClient.set(cacheKey, JSON.stringify(results), 'EX', 60);
  return results;
}
```

## 更新日志

- **2025-01-28**: 初始版本发布
  - 添加 `GET /api/v1/ecommerce/draws/recent-winners` 端点
  - 支持自定义返回数量（最大100条）
  - 自动格式化奖品信息
