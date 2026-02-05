# Bot Module - 机器人自动化系统

## 📖 简介

Bot Module 是一个可扩展的机器人自动化系统，用于模拟用户行为。当前支持一元购（Lucky Draw）自动下单功能，未来可扩展到其他场景。

## ✨ 特性

- ✅ **可扩展架构**: 基于执行器模式，轻松添加新的 bot 类型
- ✅ **智能调度**: 自动任务调度，支持随机延迟避免模式识别
- ✅ **灵活配置**: 支持下单节奏、数量、活跃时段、填充上限等参数
- ✅ **完整的管理 API**: 用户管理、任务控制、日志查询
- ✅ **安全可靠**: 事务保证、余额检查、日志审计

## 🏗️ 架构

```
bot/
├── core/                          # 核心共用层
│   ├── entities/                  # 通用实体
│   ├── services/                  # 核心服务
│   └── interfaces/                # 执行器接口
│
├── executors/                     # 执行器层
│   ├── lucky-draw/                # 一元购 bot
│   └── [future-type]/             # 未来扩展...
│
├── controllers/                   # Admin API
├── dto/                          # 数据传输对象
└── bot.module.ts                 # 模块定义
```

## 🚀 快速开始

### 1. 创建机器人用户

```bash
POST /admin/bot/users/batch-create
Content-Type: application/json

{
  "count": 20,
  "initialBalance": 100
}
```

### 2. 为产品配置一元购 Bot

```bash
POST /admin/bot/lucky-draw/tasks/create
Content-Type: application/json

{
  "productId": 10,
  "config": {
    "minIntervalSeconds": 60,
    "maxIntervalSeconds": 300,
    "minQuantity": 1,
    "maxQuantity": 3,
    "maxFillPercentage": 80,
    "activeHours": [10, 11, 12, 14, 15, 16, 18, 19, 20]
  }
}
```

### 3. 启用 Bot

```bash
POST /admin/bot/lucky-draw/configs/10/enable
```

### 4. 监控运行

```bash
# 查看统计
GET /admin/bot/users/stats

# 查看日志
GET /admin/bot/logs?taskType=LUCKY_DRAW
```

## 📊 配置参数说明

### Lucky Draw Bot 配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `minIntervalSeconds` | 最小下单间隔（秒） | 30 |
| `maxIntervalSeconds` | 最大下单间隔（秒） | 300 |
| `minQuantity` | 单次最小购买数量 | 1 |
| `maxQuantity` | 单次最大购买数量 | 5 |
| `dailyOrderLimit` | 每日下单上限 | 100 |
| `maxFillPercentage` | 最大填充百分比 | 80 |
| `activeHours` | 活跃时段（0-23） | [] (全天) |

### 工作机制

- **随机延迟**: 下次执行时间在 `[minInterval, maxInterval]` 范围内随机生成
- **随机数量**: 购买数量在 `[minQuantity, maxQuantity]` 范围内随机生成
- **时段控制**: `activeHours` 为空表示全天活跃，否则仅在指定小时执行
- **填充上限**: 当期次填充达到 `maxFillPercentage` 时停止下单，为真实用户留空间

## 📂 数据库表

### 核心表

- `yoho_bot_users`: 机器人用户扩展信息
- `yoho_bot_tasks`: 通用任务定义
- `yoho_bot_task_logs`: 执行日志

### 执行器专用表

- `yoho_bot_lucky_draw_configs`: 一元购 bot 配置

### User 表变更

- 新增字段 `is_bot`: 标识是否为机器人
- 新增字段 `bot_config`: 机器人配置（JSONB）

## 🔧 技术细节

### 调度机制

- **频率**: 每 10 秒检查一次（`@Cron(CronExpression.EVERY_10_SECONDS)`）
- **并发**: 并发执行所有到期任务
- **重置**: 每天零点重置 `executionsToday` 计数器

### 执行流程

1. `canExecute()` - 检查执行条件（配置、时段、限额、填充率）
2. `getAvailableBot()` - 获取有足够余额的随机机器人
3. `execute()` - 执行业务逻辑（如下单）
4. `calculateNextExecuteTime()` - 计算下次执行时间（随机延迟）
5. 记录日志、更新任务状态

### 安全保障

- 复用现有业务逻辑（如 `DrawService.purchaseSpots()`），保证数据一致性
- 悲观锁防止并发问题
- 余额不足自动跳过
- 完整的日志审计

## 🎯 扩展新的 Bot 类型

添加新的 bot 类型（如 BTC 预测游戏）只需：

1. 在 `executors/` 下创建新文件夹
2. 创建配置实体（继承或独立）
3. 实现 `IBotExecutor` 接口：
   ```typescript
   export class BtcPredictionExecutor implements IBotExecutor {
     readonly type = 'BTC_PREDICTION';

     async execute(task, botUser) { ... }
     async canExecute(task) { ... }
     calculateNextExecuteTime(task) { ... }
     async getAvailableBot(task) { ... }
   }
   ```
4. 在 `OnModuleInit` 中注册到调度器
5. 更新 `BotModule` 导入相关实体

参考 `executors/lucky-draw/` 的实现。

## 📚 相关文档

- [完整 API 文档](../docs/BOT_MODULE_API.md)
- [一元购实施计划](../plan/lucky-draw-bot-auto-order-plan.md)

## ⚠️ 注意事项

1. **余额管理**: 定期检查机器人余额，及时充值
2. **填充控制**: 合理设置 `maxFillPercentage`，避免挤占真实用户空间
3. **行为模拟**: 使用随机延迟和数量，降低被识别风险
4. **监控日志**: 定期查看 `FAILED` 和 `SKIPPED` 日志，排查问题

## 🔮 未来规划

- [ ] 前端管理页面（React）
- [ ] BTC 预测游戏 bot
- [ ] 社交互动 bot（点赞、评论等）
- [ ] WebSocket 实时状态推送
- [ ] 更多随机化策略（设备信息、IP 模拟等）
