# BTC预测游戏客户端使用指南

## 快速开始

### 1. 基本连接
```typescript
import { GameClient } from './game-client-socket-example';

// 创建客户端
const client = new GameClient('https://yoho-api-service-dev-ff05bf602cab.herokuapp.com', 'your-user-id');

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

#### 历史数据查询
```typescript
// 获取用户投注历史（从数据库）
socket.emit('getUserBetHistory', { 
  limit: 20, 
  offset: 0 
});

// 获取游戏轮次历史（从数据库）
socket.emit('getGameRoundHistory', { 
  limit: 10, 
  offset: 0 
});

// 获取用户投注统计
socket.emit('getUserBettingStats', { 
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

#### 平台费用统计
```typescript
// 获取游戏服务健康状态
socket.emit('getGameHealth');
```

### 3. 监听事件

客户端会自动监听以下事件：

#### 游戏相关事件
- `gameStatus` - 游戏状态更新
- `btcPriceUpdate` - BTC实时价格更新
- `betPlaced` - 投注结果
- `userBet` - 用户投注状态
- `gameHistory` - 游戏历史数据
- `gameSettled` - 游戏结算结果

#### 历史数据事件
- `historicalPrices` - 历史价格数据
- `userBetHistory` - 用户投注历史
- `gameRoundHistory` - 游戏轮次历史
- `userBettingStats` - 用户投注统计

#### 系统状态事件
- `gameHealth` - 游戏服务健康状态
- `platformFeeStats` - 平台费用统计
- `error` - 错误信息

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

### 用户投注历史 (userBetHistory)
```json
{
  "bets": [
    {
      "id": 1,
      "userId": "user123",
      "direction": "UP",
      "amount": 10,
      "status": "WON",
      "payout": 18.5,
      "multiplier": 1.85,
      "timestamp": 1703123456789,
      "gameRoundId": "round_1234567890"
    }
  ],
  "total": 25,
  "limit": 20,
  "offset": 0
}
```

### 游戏轮次历史 (gameRoundHistory)
```json
{
  "rounds": [
    {
      "id": 1,
      "roundId": "round_1234567890",
      "result": "UP_WIN",
      "lockedPrice": "65000.00",
      "closedPrice": "65100.00",
      "totalPool": 1000,
      "totalPayout": 850,
      "platformFee": 25.5,
      "netProfit": 150,
      "startTime": 1703123400000
    }
  ],
  "total": 100,
  "limit": 10,
  "offset": 0
}
```

### 用户投注统计 (userBettingStats)
```json
{
  "stats": {
    "totalBets": 25,
    "totalAmount": 500,
    "wonBets": 15,
    "lostBets": 10,
    "totalPayout": 750,
    "winRate": 60
  },
  "userId": "user123",
  "period": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31"
  }
}
```

### 游戏服务健康状态 (gameHealth)
```json
{
  "game": {
    "isActive": true,
    "currentRound": {
      "id": "round_1234567890",
      "phase": "BETTING",
      "phaseRemainingTime": 15000
    },
    "historyCount": 50
  },
  "binance": {
    "connected": true,
    "lastMessageTime": 1703123456789,
    "streams": ["BTCUSDT@index"]
  },
  "historicalPrices": {
    "count": 100,
    "latestPrice": "65000.50",
    "oldestPrice": "64900.00",
    "lastUpdate": 1703123456789
  },
  "server": {
    "connectedClients": 25,
    "currentBtcPrice": "65000.50"
  }
}
```

## 完整使用示例

### 基础游戏流程
```typescript
import { GameClient } from './game-client-socket-example';

const client = new GameClient('https://yoho-api-service-dev-ff05bf602cab.herokuapp.com', 'user123');

// 连接服务器
await client.connect();

// 监听游戏状态
client.socket.on('gameStatus', (data) => {
  console.log('游戏状态:', data);
});

// 监听历史价格
client.socket.on('historicalPrices', (data) => {
  console.log('历史价格数据:', data);
});

// 投注
client.placeBet('UP', 10);

// 查询用户投注历史
client.socket.emit('getUserBetHistory', { 
  limit: 20 
});

// 监听投注历史结果
client.socket.on('userBetHistory', (data) => {
  console.log('用户投注历史:', data);
});
```

### 高级功能使用
```typescript
// 获取平台费用统计
client.socket.emit('getPlatformFeeStats', {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

// 获取用户投注统计
client.socket.emit('getUserBettingStats', {
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});

client.socket.on('userBettingStats', (data) => {
  console.log('用户投注统计:', data.stats);
});

// 检查服务健康状态
client.socket.emit('getGameHealth');

client.socket.on('gameHealth', (health) => {
  console.log('服务健康状态:', health);
});
```

## 错误处理

```typescript
// 监听错误事件
client.socket.on('error', (error) => {
  console.error('服务器错误:', error);
});

// 监听连接状态
client.socket.on('disconnect', (reason) => {
  console.log('连接断开:', reason);
});

client.socket.on('connect_error', (error) => {
  console.error('连接错误:', error);
});
```

## WebSocket API 参考

### 发送事件 (客户端 → 服务器)

| 事件名称 | 参数 | 描述 |
|---------|------|------|
| `join` | 无 | 加入游戏 |
| `placeBet` | `{userId, direction, amount}` | 放置投注 |
| `getUserBet` | `{userId}` | 获取用户投注状态 |
| `getGameStatus` | 无 | 获取游戏状态 |
| `getGameHistory` | `{limit?}` | 获取游戏历史 |
| `getHistoricalPrices` | `{limit?}` | 获取历史价格数据 |
| `refreshHistoricalPrices` | 无 | 刷新历史价格数据 |
| `getUserBetHistory` | `{userId, limit?, offset?}` | 获取用户投注历史 |
| `getGameRoundHistory` | `{limit?, offset?}` | 获取游戏轮次历史 |
| `getUserBettingStats` | `{userId, startDate?, endDate?}` | 获取用户投注统计 |
| `getPlatformFeeStats` | `{startDate?, endDate?}` | 获取平台费用统计 |
| `getGameHealth` | 无 | 获取服务健康状态 |

### 接收事件 (服务器 → 客户端)

| 事件名称 | 数据格式 | 描述 |
|---------|----------|------|
| `gameStatus` | GameStatus | 游戏状态更新 |
| `btcPriceUpdate` | PriceData | BTC价格更新 |
| `historicalPrices` | HistoricalPrices | 历史价格数据 |
| `betPlaced` | BetResult | 投注结果 |
| `userBet` | UserBet | 用户投注状态 |
| `gameHistory` | GameHistory | 游戏历史数据 |
| `gameSettled` | GameSettled | 游戏结算结果 |
| `userBetHistory` | UserBetHistory | 用户投注历史 |
| `gameRoundHistory` | GameRoundHistory | 游戏轮次历史 |
| `userBettingStats` | UserBettingStats | 用户投注统计 |
| `platformFeeStats` | PlatformFeeStats | 平台费用统计 |
| `gameHealth` | GameHealth | 服务健康状态 |
| `error` | ErrorData | 错误信息 |

## 配置说明

### 游戏配置
- **投注阶段**: 15秒
- **等待阶段**: 5秒  
- **结算阶段**: 3秒
- **平台手续费**: 3%
- **最低投注**: 1 USDT

### 连接配置
- **服务器地址**: `https://yoho-api-service-dev-ff05bf602cab.herokuapp.com`
- **WebSocket路径**: `/ws`
- **认证**: 需要JWT Token
- **传输方式**: WebSocket + Polling

## 最佳实践

### 1. 连接管理
```typescript
// 自动重连
client.socket.on('disconnect', () => {
  setTimeout(() => {
    client.connect();
  }, 5000);
});
```

### 2. 错误处理
```typescript
// 统一错误处理
client.socket.on('error', (error) => {
  console.error('游戏错误:', error);
  // 根据错误类型进行处理
});
```

### 3. 数据缓存
```typescript
// 缓存历史数据
let cachedHistory = null;
client.socket.on('userBetHistory', (data) => {
  cachedHistory = data;
});
```

### 4. 性能优化
```typescript
// 限制查询频率
let lastQueryTime = 0;
const queryInterval = 5000; // 5秒

function queryData() {
  const now = Date.now();
  if (now - lastQueryTime < queryInterval) {
    return;
  }
  lastQueryTime = now;
  client.socket.emit('getGameStatus');
}
```
