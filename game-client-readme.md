# BTC预测游戏

## 快速开始

### 1. 基本连接
```typescript
import { GameClient } from './game-client-socket-example';

// 创建客户端
const client = new GameClient('http://localhost:3000', 'your-user-id');

// 连接服务器
await client.connect();
```

### 2. 常用操作

#### 投注
```typescript
// 投注上涨，金额10 USDT
client.placeBet('UP', 10);

// 投注下跌，金额20 USDT  
client.placeBet('DOWN', 20);
```

#### 查询数据
```typescript
// 获取游戏状态
client.getGameStatus();

// 获取用户投注状态
client.getUserBet();

// 获取历史价格数据
client.getHistoricalPrices(100);

// 获取游戏历史
client.getGameHistory(10);
```

### 3. 监听事件

客户端会自动监听以下事件：

- `gameStatus` - 游戏状态更新
- `historicalPrices` - 历史价格数据
- `btcPriceUpdate` - BTC实时价格更新
- `betPlaced` - 投注结果
- `userBet` - 用户投注状态
- `gameHistory` - 游戏历史数据
- `gameSettled` - 游戏结算结果

## 事件数据格式

### 游戏状态 (gameStatus)
```json
{
  "roundId": "round_1234567890",
  "phase": "BETTING",
  "phaseRemainingTime": 15000,
  "currentPrice": "65000.50",
  "lockedPrice": null,
  "closedPrice": null,
  "bettingPool": {
    "upTotal": 1000,
    "downTotal": 800,
    "totalPool": 1800
  },
  "odds": {
    "up": 1.8,
    "down": 2.25
  },
  "platformFee": 0.03,
  "minBetAmount": 1
}
```

### 历史价格 (historicalPrices)
```json
{
  "prices": [
    {
      "symbol": "BTCUSDT",
      "price": "65000.00",
      "timestamp": 1703123456789,
      "openTime": 1703123400000,
      "closeTime": 1703123456789
    }
  ],
  "count": 100
}
```

### 投注结果 (betPlaced)
```json
{
  "success": true,
  "message": "Bet placed successfully",
  "bet": {
    "userId": "user123",
    "direction": "UP",
    "amount": 10,
    "timestamp": 1703123456789,
    "gameRoundId": "round_1234567890"
  }
}
```
