# Bot Module API Documentation

## 概述

Bot Module 提供了一套完整的机器人自动化系统，用于模拟用户行为（如一元购自动下单）。系统采用执行器模式，支持扩展新的 bot 类型。

## 架构说明

### 核心组件

- **BotUser**: 机器人用户实体，关联 User 表
- **BotTask**: 任务实体，定义要执行的自动化任务
- **BotScheduler**: 调度器，每 10 秒检查并执行到期的任务
- **Executor**: 执行器接口，每种 bot 类型实现此接口

### 当前支持的 Bot 类型

- **LUCKY_DRAW**: 一元购自动下单

---

## API 端点

### 1. 机器人用户管理

#### 1.1 批量创建机器人用户

```
POST /admin/bot/users/batch-create
```

**请求体**:
```json
{
  "count": 10,
  "displayNamePrefix": "Bot_",
  "initialBalance": 100
}
```

**参数说明**:
- `count`: 创建数量（1-100）
- `displayNamePrefix` (可选): 显示名称前缀
- `initialBalance` (可选): 初始余额（USD）

**响应**:
```json
{
  "success": true,
  "count": 10,
  "botUsers": [
    {
      "userId": "1234567890",
      "displayName": "Bot_Lucky Alex",
      "displayAvatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=xyz",
      "enabled": true
    }
  ]
}
```

---

#### 1.2 获取机器人用户列表

```
GET /admin/bot/users?page=1&limit=20&enabled=true
```

**查询参数**:
- `page` (可选): 页码，默认 1
- `limit` (可选): 每页数量，默认 20
- `enabled` (可选): 是否启用
- `hasBalance` (可选): 是否有余额

**响应**:
```json
{
  "success": true,
  "items": [...],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

#### 1.3 为机器人充值

```
POST /admin/bot/users/:userId/recharge
```

**请求体**:
```json
{
  "amount": 50
}
```

**响应**:
```json
{
  "success": true,
  "message": "Bot user 1234567890 recharged with 50 USD"
}
```

---

#### 1.4 批量充值所有机器人

```
POST /admin/bot/users/batch-recharge
```

**请求体**:
```json
{
  "amountPerBot": 20
}
```

**响应**:
```json
{
  "success": true,
  "success": 95,
  "failed": 5
}
```

---

#### 1.5 获取机器人统计信息

```
GET /admin/bot/users/stats
```

**响应**:
```json
{
  "success": true,
  "stats": {
    "totalBots": 100,
    "enabledBots": 95,
    "totalBalance": "5000.00",
    "avgBalance": "50.00",
    "botsWithLowBalance": 10
  }
}
```

---

#### 1.6 启用/禁用机器人

```
PATCH /admin/bot/users/:userId/toggle
```

**请求体**:
```json
{
  "enabled": false
}
```

---

#### 1.7 删除机器人

```
DELETE /admin/bot/users/:userId
```

**响应**:
```json
{
  "success": true,
  "message": "Bot user 1234567890 deleted"
}
```

---

### 2. 任务管理

#### 2.1 获取任务列表

```
GET /admin/bot/tasks?taskType=LUCKY_DRAW&enabled=true&page=1&limit=20
```

**查询参数**:
- `taskType` (可选): 任务类型（LUCKY_DRAW 等）
- `enabled` (可选): 是否启用
- `page`, `limit`: 分页参数

---

#### 2.2 启动任务

```
POST /admin/bot/tasks/:taskId/start
```

立即启用任务并安排执行。

---

#### 2.3 停止任务

```
POST /admin/bot/tasks/:taskId/stop
```

---

#### 2.4 获取任务状态

```
GET /admin/bot/tasks/:taskId/status
```

**响应**:
```json
{
  "success": true,
  "status": {
    "running": true,
    "lastExecutedAt": "2024-01-15T10:30:00Z",
    "nextExecuteAt": "2024-01-15T10:35:00Z",
    "executionsToday": 45
  }
}
```

---

### 3. 一元购 Bot 配置

#### 3.1 获取所有配置

```
GET /admin/bot/lucky-draw/configs
```

**响应**:
```json
{
  "success": true,
  "configs": [
    {
      "id": 1,
      "productId": 10,
      "enabled": true,
      "minIntervalSeconds": 30,
      "maxIntervalSeconds": 300,
      "minQuantity": 1,
      "maxQuantity": 5,
      "dailyOrderLimit": 100,
      "maxFillPercentage": 80,
      "activeHours": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    }
  ]
}
```

---

#### 3.2 获取单个产品配置

```
GET /admin/bot/lucky-draw/configs/:productId
```

如果配置不存在，会自动创建默认配置。

---

#### 3.3 更新配置

```
PUT /admin/bot/lucky-draw/configs/:productId
```

**请求体**:
```json
{
  "enabled": true,
  "minIntervalSeconds": 60,
  "maxIntervalSeconds": 600,
  "minQuantity": 1,
  "maxQuantity": 3,
  "dailyOrderLimit": 50,
  "maxFillPercentage": 75,
  "activeHours": [10, 11, 12, 14, 15, 16, 18, 19, 20]
}
```

**配置参数说明**:
- `minIntervalSeconds`: 最小下单间隔（秒）
- `maxIntervalSeconds`: 最大下单间隔（秒）
- `minQuantity`: 单次最小购买数量
- `maxQuantity`: 单次最大购买数量
- `dailyOrderLimit`: 每日下单上限
- `maxFillPercentage`: 机器人最多填充到该百分比（保留空间给真实用户）
- `activeHours`: 活跃时段（0-23），空数组表示全天

---

#### 3.4 创建一元购任务

```
POST /admin/bot/lucky-draw/tasks/create
```

**请求体**:
```json
{
  "productId": 10,
  "config": {
    "minIntervalSeconds": 30,
    "maxIntervalSeconds": 300,
    "minQuantity": 1,
    "maxQuantity": 5,
    "dailyOrderLimit": 100,
    "maxFillPercentage": 80,
    "activeHours": []
  }
}
```

**响应**:
```json
{
  "success": true,
  "task": {
    "id": 1,
    "taskType": "LUCKY_DRAW",
    "targetId": "10",
    "enabled": false
  },
  "config": {...}
}
```

---

#### 3.5 启用一元购 Bot

```
POST /admin/bot/lucky-draw/configs/:productId/enable
```

同时启用配置和任务。

---

#### 3.6 禁用一元购 Bot

```
POST /admin/bot/lucky-draw/configs/:productId/disable
```

---

### 4. 日志查询

#### 4.1 获取执行日志

```
GET /admin/bot/logs?taskType=LUCKY_DRAW&status=SUCCESS&page=1&limit=50
```

**查询参数**:
- `taskType` (可选): 任务类型
- `taskId` (可选): 任务 ID
- `status` (可选): SUCCESS | FAILED | SKIPPED
- `botUserId` (可选): 机器人用户 ID
- `page`, `limit`: 分页参数

**响应**:
```json
{
  "success": true,
  "items": [
    {
      "id": 1,
      "taskId": 1,
      "taskType": "LUCKY_DRAW",
      "botUserId": "1234567890",
      "status": "SUCCESS",
      "details": {
        "productId": 10,
        "quantity": 3,
        "orderNumber": "DRAW1234567890ABC",
        "drawRoundId": 5,
        "roundNumber": 123,
        "startNumber": 45,
        "endNumber": 47,
        "totalAmount": "0.30"
      },
      "errorMessage": null,
      "executionTimeMs": 245,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 500,
  "page": 1,
  "limit": 50
}
```

---

## 使用流程

### 快速开始 - 一元购 Bot

1. **创建机器人用户**
   ```bash
   POST /admin/bot/users/batch-create
   {
     "count": 20,
     "initialBalance": 100
   }
   ```

2. **为产品创建任务和配置**
   ```bash
   POST /admin/bot/lucky-draw/tasks/create
   {
     "productId": 10,
     "config": {
       "minIntervalSeconds": 60,
       "maxIntervalSeconds": 300,
       "minQuantity": 1,
       "maxQuantity": 3,
       "dailyOrderLimit": 100,
       "maxFillPercentage": 80,
       "activeHours": [10, 11, 12, 14, 15, 16, 18, 19, 20]
     }
   }
   ```

3. **启用 Bot**
   ```bash
   POST /admin/bot/lucky-draw/configs/10/enable
   ```

4. **监控执行情况**
   ```bash
   GET /admin/bot/logs?taskType=LUCKY_DRAW
   GET /admin/bot/users/stats
   ```

5. **根据需要调整配置**
   ```bash
   PUT /admin/bot/lucky-draw/configs/10
   {
     "maxFillPercentage": 70
   }
   ```

---

## 工作原理

### 调度器

- 每 10 秒执行一次检查（`@Cron(CronExpression.EVERY_10_SECONDS)`）
- 查找 `enabled=true` 且 `nextExecuteAt <= now` 的任务
- 并发执行所有到期任务

### 执行流程

1. **canExecute()**: 检查是否可执行
   - 配置是否启用
   - 是否在活跃时段
   - 是否超过每日限额
   - 填充百分比是否超过上限
   - 是否有足够的剩余号码

2. **getAvailableBot()**: 获取可用的机器人
   - 必须 `enabled=true`
   - 必须有足够的余额

3. **execute()**: 执行下单
   - 调用 `DrawService.purchaseSpots()`
   - 记录执行日志

4. **calculateNextExecuteTime()**: 计算下次执行时间
   - 随机延迟（minInterval ~ maxInterval）

5. **更新任务状态**
   - `lastExecutedAt`
   - `executionsToday++`
   - `nextExecuteAt`

### 每日重置

- 每天零点执行 `@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)`
- 重置 `executionsToday` 为 0

---

## 安全注意事项

1. **机器人识别**: 所有 API 都在 `/admin/bot` 下，需要 `AdminJwtGuard` 认证
2. **余额管理**: 机器人余额不足时会自动跳过任务
3. **填充上限**: 通过 `maxFillPercentage` 为真实用户保留空间
4. **日志审计**: 所有执行都有完整的日志记录

---

## 扩展新的 Bot 类型

如需添加新的 bot 类型（如 BTC 预测游戏自动下注），按以下步骤：

1. 在 `executors/` 下创建新的子文件夹（如 `btc-prediction/`）
2. 创建配置实体（如 `BtcPredictionConfig`）
3. 实现 `IBotExecutor` 接口
4. 在 `OnModuleInit` 中注册到调度器
5. 在 `BotModule` 中注册相关实体和服务
6. 添加对应的 Admin API 端点

示例代码框架见 `executors/lucky-draw/`。
