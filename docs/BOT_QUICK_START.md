# Lucky Draw Bot - 快速开始指南

## 🚀 5 分钟快速上手

### 前置条件

- 项目已启动：`npm run start:dev`
- 已有 Admin 权限的 JWT Token
- 已有至少一个一元购产品（productId）

---

## 步骤 1: 创建机器人用户

```bash
curl -X POST http://localhost:3001/admin/bot/users/batch-create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "count": 20,
    "displayNamePrefix": "User_",
    "initialBalance": 100
  }'
```

**结果**: 创建 20 个机器人用户，每个初始余额 $100

---

## 步骤 2: 为产品创建 Bot 任务

假设你的产品 ID 是 `10`：

```bash
curl -X POST http://localhost:3001/admin/bot/lucky-draw/tasks/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
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
  }'
```

**配置说明**:
- 下单间隔：60-300 秒随机
- 购买数量：1-3 个随机
- 每日最多 100 单
- 最多填充到 80%
- 仅在 10:00-20:00 活跃

---

## 步骤 3: 启用 Bot

```bash
curl -X POST http://localhost:3001/admin/bot/lucky-draw/configs/10/enable \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**结果**: Bot 开始自动下单！

---

## 步骤 4: 监控运行状态

### 查看机器人统计

```bash
curl -X GET http://localhost:3001/admin/bot/users/stats \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**响应示例**:
```json
{
  "success": true,
  "stats": {
    "totalBots": 20,
    "enabledBots": 20,
    "totalBalance": "2000.00",
    "avgBalance": "100.00",
    "botsWithLowBalance": 0
  }
}
```

### 查看执行日志

```bash
curl -X GET "http://localhost:3001/admin/bot/logs?taskType=LUCKY_DRAW&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 查看任务状态

```bash
curl -X GET http://localhost:3001/admin/bot/tasks/1/status \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

**响应示例**:
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

## 常见操作

### 暂停 Bot

```bash
curl -X POST http://localhost:3001/admin/bot/lucky-draw/configs/10/disable \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

### 调整配置

```bash
curl -X PUT http://localhost:3001/admin/bot/lucky-draw/configs/10 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{
    "maxFillPercentage": 70,
    "dailyOrderLimit": 50
  }'
```

### 为机器人充值

单个充值：
```bash
curl -X POST http://localhost:3001/admin/bot/users/BOT_USER_ID/recharge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"amount": 50}'
```

批量充值：
```bash
curl -X POST http://localhost:3001/admin/bot/users/batch-recharge \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -d '{"amountPerBot": 50}'
```

---

## 故障排查

### Bot 没有下单？

1. **检查任务是否启用**
   ```bash
   GET /admin/bot/tasks?taskType=LUCKY_DRAW
   ```
   确认 `enabled: true`

2. **检查配置是否启用**
   ```bash
   GET /admin/bot/lucky-draw/configs/10
   ```
   确认 `enabled: true`

3. **检查是否在活跃时段**
   - 如果设置了 `activeHours`，确保当前小时在范围内
   - 或者设置 `activeHours: []` 全天活跃

4. **检查是否达到每日限额**
   ```bash
   GET /admin/bot/tasks/1/status
   ```
   查看 `executionsToday` 是否达到 `dailyOrderLimit`

5. **检查填充百分比**
   - 期次填充可能已达到 `maxFillPercentage`
   - 调低该参数或等待新期次

6. **查看失败日志**
   ```bash
   GET /admin/bot/logs?status=FAILED
   ```

### 机器人余额不足？

```bash
# 查看统计
GET /admin/bot/users/stats

# 批量充值
POST /admin/bot/users/batch-recharge
{"amountPerBot": 100}
```

---

## 推荐配置

### 新活动（快速填充）

```json
{
  "minIntervalSeconds": 30,
  "maxIntervalSeconds": 120,
  "minQuantity": 2,
  "maxQuantity": 5,
  "dailyOrderLimit": 200,
  "maxFillPercentage": 85,
  "activeHours": []
}
```

### 稳定运营（模拟真实用户）

```json
{
  "minIntervalSeconds": 120,
  "maxIntervalSeconds": 600,
  "minQuantity": 1,
  "maxQuantity": 3,
  "dailyOrderLimit": 50,
  "maxFillPercentage": 70,
  "activeHours": [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]
}
```

---

## 下一步

- 📖 阅读 [完整 API 文档](../docs/BOT_MODULE_API.md)
- 🏗️ 查看 [架构说明](../src/api-modules/bot/README.md)
- 📋 参考 [实施总结](./lucky-draw-bot-auto-order-summary.md)
