# 任务系统 API 文档

## 概述

任务系统提供了一套完整的活动、任务和奖励管理功能。系统采用三级结构：**活动(Campaign) -> 任务(Task) -> 奖励(Reward)**。

**Base URL**: `/api/v1/campaigns`

**认证**: 大部分接口需要 JWT 认证，在请求头中添加 `Authorization: Bearer <token>`

---

## 目录

- [活动管理](#活动管理)
- [任务管理](#任务管理)
- [用户操作](#用户操作)
- [数据模型](#数据模型)

---

## 活动管理

### 1. 获取活动列表

获取所有可见的活动列表。

**接口**: `GET /api/v1/campaigns`

**认证**: 不需要

**查询参数**:
- `status` (可选): 活动状态筛选，可选值：`DRAFT`, `ACTIVE`, `PAUSED`, `ENDED`

**响应示例**:
```json
{
  "campaigns": [
    {
      "id": 1,
      "name": "新用户送$100现金活动",
      "description": "完成指定任务，获得对应现金奖励",
      "code": "NEW_USER_100",
      "status": "ACTIVE",
      "startTime": "2024-01-01T00:00:00.000Z",
      "endTime": null,
      "participationConditions": {
        "userScope": "ALL"
      },
      "rewardConfig": {
        "totalRewardAmount": 100,
        "currency": "USD",
        "rewardType": "CASH",
        "requireClaim": true,
        "claimExpiryDays": 7
      },
      "sortOrder": 0,
      "isVisible": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. 获取活动详情

获取指定活动的详细信息，包含任务列表。

**接口**: `GET /api/v1/campaigns/:id`

**认证**: 不需要

**路径参数**:
- `id` (number): 活动ID

**响应示例**:
```json
{
  "campaign": {
    "id": 1,
    "name": "新用户送$100现金活动",
    "description": "完成指定任务，获得对应现金奖励",
    "status": "ACTIVE",
    "tasks": [
      {
        "id": 1,
        "name": "注册",
        "type": "REGISTER",
        "repeatType": "ONCE",
        "rewards": [
          {
            "id": 1,
            "rewardType": "CASH",
            "grantType": "FIXED",
            "amount": 10,
            "currency": "USD"
          }
        ]
      }
    ]
  }
}
```

---

## 任务管理

### 5. 获取活动下的任务列表

获取指定活动下的所有任务。

**接口**: `GET /api/v1/campaigns/:id/tasks`

**认证**: 不需要

**路径参数**:
- `id` (number): 活动ID

**响应示例**:
```json
{
  "tasks": [
    {
      "id": 1,
      "campaignId": 1,
      "name": "注册",
      "description": "完成账户创建（含授权登录）",
      "type": "REGISTER",
      "repeatType": "ONCE",
      "maxCompletions": 1,
      "completionConditions": {},
      "deadline": null,
      "redirectUrl": null,
      "sortOrder": 1,
      "isLocked": false,
      "status": "ACTIVE",
      "rewards": [
        {
          "id": 1,
          "rewardType": "CASH",
          "grantType": "FIXED",
          "amount": 10,
          "currency": "USD",
          "targetBalance": "GAME_BALANCE"
        }
      ]
    }
  ]
}
```

---

### 6. 获取任务详情

获取指定任务的详细信息。

**接口**: `GET /api/v1/campaigns/tasks/:taskId`

**认证**: 不需要

**路径参数**:
- `taskId` (number): 任务ID

**响应**: 返回任务详情，包含奖励配置

---

### 7. 创建任务（管理员）

创建新任务。

**接口**: `POST /api/v1/campaigns/tasks`

**认证**: 需要 (JWT)

**请求体**:
```json
{
  "campaignId": 1,
  "name": "注册",
  "description": "完成账户创建（含授权登录）",
  "type": "REGISTER",
  "repeatType": "ONCE",
  "maxCompletions": 1,
  "completionConditions": {},
  "deadline": null,
  "redirectUrl": null,
  "sortOrder": 1,
  "isLocked": false,
  "status": "ACTIVE",
  "rewards": [
    {
      "rewardType": "CASH",
      "grantType": "FIXED",
      "amount": 10,
      "currency": "USD",
      "targetBalance": "GAME_BALANCE"
    }
  ]
}
```

**字段说明**:
- `campaignId` (number, 必填): 所属活动ID
- `name` (string, 必填): 任务名称
- `description` (string, 可选): 任务描述
- `type` (enum, 必填): 任务类型，可选值：
  - `REGISTER`: 注册
  - `DEPOSIT`: 充值
  - `CHECK_IN`: 签到
  - `ADD_BOTIM_FRIEND`: 添加botim小助手
  - `FOLLOW_BOTIM_OFFICIAL`: 关注botim公众号
  - `TRADE_BTC`: 交易BTC
  - `PLAY_PREDICTION`: 玩猜涨跌游戏
  - `TRADE_VOLUME`: 交易流水
  - `GAME_VOLUME`: 游戏流水
  - `CUSTOM`: 自定义任务
- `repeatType` (enum, 可选): 重复类型，可选值：`ONCE`, `DAILY`, `WEEKLY`, `MONTHLY`, `UNLIMITED`
- `maxCompletions` (number, 可选): 最大完成次数，默认 1
- `completionConditions` (object, 可选): 完成条件配置
  - `minAmount`: 最小金额（如交易流水≥$10）
  - `currency`: 货币类型
  - `coinType`: 币种（如BTC）
  - `targetId`: 目标ID（如botim账号ID）
- `deadline` (string, 可选): 截止时间，ISO 8601 格式
- `redirectUrl` (string, 可选): 跳转链接
- `sortOrder` (number, 可选): 排序优先级
- `isLocked` (boolean, 可选): 是否锁定
- `status` (string, 可选): 任务状态，默认 `ACTIVE`
- `rewards` (array, 可选): 奖励配置数组
  - `rewardType`: 奖励类型，可选值：`CASH`, `POINTS`, `BONUS`, `CUSTOM`
  - `grantType`: 发放类型，可选值：`FIXED`, `RANDOM`, `PROGRESSIVE`
  - `amount`: 固定金额（grantType为FIXED时使用）
  - `amountConfig`: 金额配置（用于随机或渐进式奖励）
    - `min`: 最小金额
    - `max`: 最大金额
    - `progressiveRules`: 渐进式规则数组
      - `threshold`: 已领阈值
      - `minAmount`: 该阈值下的最小金额
      - `maxAmount`: 该阈值下的最大金额
      - `meanHalf`: 是否启用均值减半
  - `currency`: 货币类型
  - `targetBalance`: 目标余额类型，可选值：`GAME_BALANCE`, `CASH_BALANCE`

**响应**: 返回创建的任务对象

---

### 8. 更新任务（管理员）

更新任务信息。

**接口**: `PUT /api/v1/campaigns/tasks/:taskId`

**认证**: 需要 (JWT)

**路径参数**:
- `taskId` (number): 任务ID

**请求体**: 同创建任务，所有字段都是可选的

**响应**: 返回更新后的任务对象

---

## 用户操作

### 9. 参与活动

用户参与指定活动。

**接口**: `POST /api/v1/campaigns/:id/participate`

**认证**: 需要 (JWT)

**路径参数**:
- `id` (number): 活动ID

**响应示例**:
```json
{
  "progress": {
    "id": 1,
    "userId": "user123",
    "campaignId": 1,
    "status": "PARTICIPATED",
    "accumulatedReward": 0,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 10. 获取用户活动进度

获取当前用户在指定活动中的进度。

**接口**: `GET /api/v1/campaigns/:id/progress`

**认证**: 需要 (JWT)

**路径参数**:
- `id` (number): 活动ID

**响应示例**:
```json
{
  "progress": {
    "id": 1,
    "userId": "user123",
    "campaignId": 1,
    "status": "COMPLETED",
    "accumulatedReward": 100,
    "completedAt": "2024-01-05T00:00:00.000Z",
    "claimExpiryAt": "2024-01-12T00:00:00.000Z"
  }
}
```

**状态说明**:
- `PARTICIPATED`: 已参与
- `COMPLETED`: 已完成（达到领取条件）
- `REWARD_CLAIMED`: 已领取奖励
- `EXPIRED`: 已过期

---

### 11. 领取活动奖励

领取活动奖励。只有当累计奖励达到活动配置的总奖励金额时才能领取。

**接口**: `POST /api/v1/campaigns/:id/claim`

**认证**: 需要 (JWT)

**路径参数**:
- `id` (number): 活动ID

**响应示例**:
```json
{
  "success": true,
  "message": "Reward claimed successfully"
}
```

**错误情况**:
- 活动进度不存在
- 奖励已领取
- 奖励未达到领取条件
- 奖励已过期（超过领取有效期）

---

### 12. 完成任务

用户完成任务。系统会自动验证完成条件并计算奖励金额（仅计数，不实际发放）。

**接口**: `POST /api/v1/campaigns/tasks/:taskId/complete`

**认证**: 需要 (JWT)

**路径参数**:
- `taskId` (number): 任务ID

**请求体**:
```json
{
  "completionData": {
    "amount": 100,
    "coinType": "BTC",
    "transactionId": "tx_123456"
  },
  "referenceId": "ref_123456"
}
```

**字段说明**:
- `completionData` (object, 可选): 完成时的数据
  - `amount`: 金额（用于验证最小金额条件）
  - `coinType`: 币种（用于验证币种条件）
  - `targetId`: 目标ID（用于验证目标ID条件）
  - `transactionId`: 交易ID
  - `gameId`: 游戏ID
  - 其他自定义字段
- `referenceId` (string, 可选): 关联的业务ID（如交易ID、游戏ID等）

**响应示例**:
```json
{
  "success": true,
  "progress": {
    "id": 1,
    "userId": "user123",
    "taskId": 1,
    "campaignId": 1,
    "status": "COMPLETED",
    "completionCount": 1,
    "accumulatedRewardAmount": 10,
    "firstCompletedAt": "2024-01-01T00:00:00.000Z",
    "lastCompletedAt": "2024-01-01T00:00:00.000Z"
  },
  "rewardAmount": 10
}
```

**错误情况**:
- 任务不存在
- 任务未激活
- 任务已过期
- 任务已完成（一次性任务）
- 完成条件不满足
- 重复任务达到每日/每周/每月限制

---

### 13. 获取用户的所有活动进度

获取当前用户参与的所有活动进度。

**接口**: `GET /api/v1/campaigns/user/progress`

**认证**: 需要 (JWT)

**响应示例**:
```json
{
  "progresses": [
    {
      "id": 1,
      "userId": "user123",
      "campaignId": 1,
      "status": "COMPLETED",
      "accumulatedReward": 100,
      "campaign": {
        "id": 1,
        "name": "新用户送$100现金活动"
      }
    }
  ]
}
```

---

### 14. 获取用户任务进度

获取当前用户在指定任务中的进度。

**接口**: `GET /api/v1/campaigns/user/tasks/:taskId/progress`

**认证**: 需要 (JWT)

**路径参数**:
- `taskId` (number): 任务ID

**响应示例**:
```json
{
  "progress": {
    "id": 1,
    "userId": "user123",
    "taskId": 1,
    "campaignId": 1,
    "status": "COMPLETED",
    "completionCount": 1,
    "accumulatedRewardAmount": 10,
    "firstCompletedAt": "2024-01-01T00:00:00.000Z",
    "lastCompletedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 15. 获取用户的所有任务进度

获取当前用户的所有任务进度，可按活动筛选。

**接口**: `GET /api/v1/campaigns/user/tasks/progress`

**认证**: 需要 (JWT)

**查询参数**:
- `campaignId` (number, 可选): 活动ID，用于筛选指定活动的任务

**响应示例**:
```json
{
  "progresses": [
    {
      "id": 1,
      "userId": "user123",
      "taskId": 1,
      "campaignId": 1,
      "status": "COMPLETED",
      "completionCount": 1,
      "accumulatedRewardAmount": 10
    }
  ]
}
```

---

### 16. 获取任务完成历史

获取用户的任务完成历史记录。

**接口**: `GET /api/v1/campaigns/user/completions`

**认证**: 需要 (JWT)

**查询参数**:
- `taskId` (number, 可选): 任务ID，用于筛选指定任务的完成记录
- `limit` (number, 可选): 每页数量，默认 20
- `offset` (number, 可选): 偏移量，默认 0

**响应示例**:
```json
{
  "completions": [
    {
      "id": 1,
      "userId": "user123",
      "taskId": 1,
      "campaignId": 1,
      "rewardAmount": 10,
      "completionData": {
        "amount": 100
      },
      "referenceId": "ref_123456",
      "completedAt": "2024-01-01T00:00:00.000Z",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 10
}
```

---

## 数据模型

### CampaignStatus (活动状态)

- `DRAFT`: 草稿
- `ACTIVE`: 进行中
- `PAUSED`: 已暂停
- `ENDED`: 已结束

### TaskType (任务类型)

- `REGISTER`: 注册
- `DEPOSIT`: 充值
- `CHECK_IN`: 签到
- `ADD_BOTIM_FRIEND`: 添加botim小助手
- `FOLLOW_BOTIM_OFFICIAL`: 关注botim公众号
- `TRADE_BTC`: 交易BTC
- `PLAY_PREDICTION`: 玩猜涨跌游戏
- `TRADE_VOLUME`: 交易流水
- `GAME_VOLUME`: 游戏流水
- `CUSTOM`: 自定义任务

### TaskRepeatType (任务重复类型)

- `ONCE`: 一次性任务
- `DAILY`: 每日重复
- `WEEKLY`: 每周重复
- `MONTHLY`: 每月重复
- `UNLIMITED`: 无限制重复

### RewardType (奖励类型)

- `CASH`: 现金
- `POINTS`: 积分
- `BONUS`: 赠金
- `CUSTOM`: 自定义

### RewardGrantType (奖励发放类型)

- `FIXED`: 固定金额
- `RANDOM`: 随机金额
- `PROGRESSIVE`: 渐进式（如签到奖励）

### UserCampaignStatus (用户活动状态)

- `PARTICIPATED`: 已参与
- `COMPLETED`: 已完成（达到领取条件）
- `REWARD_CLAIMED`: 已领取奖励
- `EXPIRED`: 已过期

---

## 使用示例

### 完整流程示例

#### 1. 用户查看活动列表
```bash
GET /api/v1/campaigns
```

#### 2. 用户查看活动详情
```bash
GET /api/v1/campaigns/1
```

#### 3. 用户参与活动
```bash
POST /api/v1/campaigns/1/participate
Authorization: Bearer <token>
```

#### 4. 用户完成任务（例如：注册）
```bash
POST /api/v1/campaigns/tasks/1/complete
Authorization: Bearer <token>
Content-Type: application/json

{
  "completionData": {},
  "referenceId": "register_123456"
}
```

#### 5. 用户查看活动进度
```bash
GET /api/v1/campaigns/1/progress
Authorization: Bearer <token>
```

#### 6. 当累计奖励达到$100时，用户领取奖励
```bash
POST /api/v1/campaigns/1/claim
Authorization: Bearer <token>
```

---

## 错误码说明

### 常见错误

- `400 Bad Request`: 请求参数错误
  - 任务已完成
  - 完成条件不满足
  - 奖励未达到领取条件
  - 奖励已过期

- `401 Unauthorized`: 未认证或认证失败

- `404 Not Found`: 资源不存在
  - 活动不存在
  - 任务不存在
  - 活动进度不存在

- `500 Internal Server Error`: 服务器内部错误

---

## 注意事项

1. **奖励发放机制**：
   - 任务完成时，奖励金额仅计数，不实际发放
   - 只有当累计奖励达到活动配置的总奖励金额时，才能领取
   - 领取后奖励发放至 Game Balance（游戏余额）

2. **重复任务限制**：
   - 每日重复任务：每天最多完成 `maxCompletions` 次
   - 每周重复任务：每周最多完成 `maxCompletions` 次
   - 每月重复任务：每月最多完成 `maxCompletions` 次

3. **签到奖励**：
   - 支持随机金额和渐进式奖励
   - 渐进式奖励会根据已累计金额调整奖励范围
   - 可以配置均值减半规则

4. **领取有效期**：
   - 活动可以配置领取有效期（默认7天）
   - 超过有效期未领取，奖励将失效

5. **任务验证**：
   - 系统会根据任务类型自动选择合适的验证器
   - 不同类型的任务有不同的验证逻辑
   - 完成条件在 `completionConditions` 中配置

---

## 管理员
### 3. 创建活动（管理员）

创建新的活动。

**接口**: `POST /api/v1/campaigns`

**认证**: 需要 (JWT)

**请求体**:
```json
{
  "name": "新用户送$100现金活动",
  "description": "完成指定任务，获得对应现金奖励",
  "code": "NEW_USER_100",
  "status": "ACTIVE",
  "startTime": "2024-01-01T00:00:00.000Z",
  "endTime": null,
  "participationConditions": {
    "userScope": "ALL"
  },
  "rewardConfig": {
    "totalRewardAmount": 100,
    "currency": "USD",
    "rewardType": "CASH",
    "requireClaim": true,
    "claimExpiryDays": 7
  },
  "sortOrder": 0,
  "isVisible": true
}
```

**字段说明**:
- `name` (string, 必填): 活动名称
- `description` (string, 可选): 活动描述
- `code` (string, 可选): 活动代码（唯一标识）
- `status` (enum, 可选): 活动状态，可选值：`DRAFT`, `ACTIVE`, `PAUSED`, `ENDED`
- `startTime` (string, 可选): 开始时间，ISO 8601 格式
- `endTime` (string, 可选): 结束时间，ISO 8601 格式，null 表示无截止期限
- `participationConditions` (object, 可选): 参与条件
  - `userScope`: 用户范围，可选值：`ALL`, `NEW`, `EXISTING` 或用户ID数组
- `rewardConfig` (object, 可选): 奖励配置
  - `totalRewardAmount`: 总奖励金额
  - `currency`: 货币类型
  - `rewardType`: 奖励类型，可选值：`CASH`, `POINTS`, `BONUS`
  - `requireClaim`: 是否需要手动领取
  - `claimExpiryDays`: 领取有效期（天数）
- `sortOrder` (number, 可选): 排序优先级
- `isVisible` (boolean, 可选): 是否可见

**响应**: 返回创建的活动对象

---

### 4. 更新活动（管理员）

更新活动信息。

**接口**: `PUT /api/v1/campaigns/:id`

**认证**: 需要 (JWT)

**路径参数**:
- `id` (number): 活动ID

**请求体**: 同创建活动，所有字段都是可选的

**响应**: 返回更新后的活动对象

---


## 更新日志

- 2024-01-01: 初始版本发布



