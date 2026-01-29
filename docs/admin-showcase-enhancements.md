# 晒单管理后台增强功能文档

## 概述

本文档描述了为晒单管理后台新增的高级管理功能，这些功能大大增强了管理员对晒单内容的管理能力。

## 新增功能列表

### 1. 高级筛选 (Advanced Search)

**端点**: `GET /api/v1/admin/showcases/advanced-search`

**功能描述**: 提供强大的多维度筛选能力

**支持的筛选条件**:
- `status`: 晒单状态（PENDING/APPROVED/REJECTED/HIDDEN）
- `userId`: 按用户 ID 筛选
- `isWinner`: 是否为中奖晒单
- `isVerified`: 是否已验证
- `isPinned`: 是否置顶
- `mediaType`: 媒体类型（IMAGE/VIDEO）
- `startDate` & `endDate`: 日期范围
- `minLikes`: 最小点赞数
- `minComments`: 最小评论数
- `minShares`: 最小分享数
- `keyword`: 关键词搜索（内容、用户名、奖品信息）

**示例请求**:
```
GET /api/v1/admin/showcases/advanced-search?
  status=APPROVED&
  isVerified=true&
  minLikes=100&
  startDate=2025-01-01&
  endDate=2025-01-31&
  keyword=iPhone
```

---

### 2. 批量操作 (Batch Operations)

#### 2.1 批量审核通过
**端点**: `POST /api/v1/admin/showcases/batch-approve`
```json
{
  "ids": [1, 2, 3, 4, 5]
}
```

#### 2.2 批量拒绝
**端点**: `POST /api/v1/admin/showcases/batch-reject`
```json
{
  "ids": [1, 2, 3],
  "reason": "内容不符合规范"
}
```

#### 2.3 批量隐藏
**端点**: `POST /api/v1/admin/showcases/batch-hide`

#### 2.4 批量删除
**端点**: `DELETE /api/v1/admin/showcases/batch-delete`

#### 2.5 批量设置验证标识
**端点**: `POST /api/v1/admin/showcases/batch-verify`
```json
{
  "ids": [1, 2, 3],
  "verificationNote": "官方认证中奖晒单"
}
```

#### 2.6 批量置顶/取消置顶
**端点**:
- `POST /api/v1/admin/showcases/batch-pin`
- `POST /api/v1/admin/showcases/batch-unpin`

---

### 3. 评论高级管理

#### 3.1 评论统计
**端点**: `GET /api/v1/admin/showcases/comments/stats`

**返回数据**:
```json
{
  "totalComments": 1500,
  "deletedComments": 50,
  "activeComments": 1450,
  "topShowcases": [
    {
      "id": 123,
      "commentCount": 89,
      "content": "晒单内容..."
    }
  ]
}
```

#### 3.2 批量删除评论
**端点**: `POST /api/v1/admin/showcases/comments/batch-delete`
```json
{
  "ids": [10, 20, 30]
}
```

#### 3.3 最近评论（实时监控）
**端点**: `GET /api/v1/admin/showcases/comments/recent?limit=50&hours=24`

**用途**: 监控最近 N 小时内的评论活动

---

### 4. 分享高级分析

#### 4.1 按平台分析分享数据
**端点**: `GET /api/v1/admin/showcases/analytics/shares/platform?startDate=2025-01-01&endDate=2025-01-31`

**返回示例**:
```json
{
  "platformStats": [
    {
      "platform": "TWITTER",
      "count": 500,
      "percentage": "45.45"
    },
    {
      "platform": "TELEGRAM",
      "count": 300,
      "percentage": "27.27"
    },
    {
      "platform": "FACEBOOK",
      "count": 200,
      "percentage": "18.18"
    },
    {
      "platform": "LINK",
      "count": 100,
      "percentage": "9.09"
    }
  ],
  "total": 1100
}
```

#### 4.2 分享趋势分析
**端点**: `GET /api/v1/admin/showcases/analytics/shares/trend?days=30`

**返回示例**:
```json
{
  "trend": [
    {
      "date": "2025-01-01",
      "count": 45
    },
    {
      "date": "2025-01-02",
      "count": 67
    }
  ],
  "totalDays": 30,
  "totalShares": 1234
}
```

#### 4.3 最受欢迎晒单（分享最多）
**端点**: `GET /api/v1/admin/showcases/analytics/shares/top-shared?limit=20`

---

### 5. 用户行为分析

#### 5.1 用户晒单活动详情
**端点**: `GET /api/v1/admin/showcases/users/:userId/activity`

**返回数据**:
```json
{
  "userId": "user123",
  "stats": {
    "totalShowcases": 15,
    "totalComments": 50,
    "totalShares": 30,
    "totalLikesReceived": 500,
    "totalCommentsReceived": 120
  },
  "recentShowcases": [...]
}
```

#### 5.2 最活跃用户排行
**端点**: `GET /api/v1/admin/showcases/users/top-contributors?limit=20`

**返回示例**:
```json
{
  "topUsers": [
    {
      "userId": "user123",
      "userName": "张三",
      "showcaseCount": 25,
      "totalLikes": 1200,
      "totalComments": 300,
      "totalShares": 150
    }
  ]
}
```

---

### 6. 内容审核工具

#### 6.1 待审核内容列表
**端点**: `GET /api/v1/admin/showcases/moderation/pending-review?limit=50`

**用途**: 获取所有待审核的晒单，按提交时间升序排列（最早提交的优先）

#### 6.2 被举报/异常内容
**端点**: `GET /api/v1/admin/showcases/moderation/flagged`

**用途**: 自动检测互动数据异常的晒单（评论数 >100 或点赞数 >500）

---

### 7. 实时监控仪表盘

#### 7.1 管理仪表盘总览
**端点**: `GET /api/v1/admin/showcases/dashboard/overview`

**返回数据**:
```json
{
  "total": 5000,
  "byStatus": {
    "pending": 50,
    "approved": 4500,
    "rejected": 300,
    "hidden": 150
  },
  "today": {
    "showcases": 25,
    "comments": 80,
    "shares": 45
  },
  "special": {
    "verified": 100,
    "winner": 50
  }
}
```

#### 7.2 最近活动（24小时）
**端点**: `GET /api/v1/admin/showcases/dashboard/recent-activity`

**返回数据**: 最近 24 小时内的晒单、评论、分享活动

---

## 完整 API 端点总结

### 基础管理（已有功能）
- `GET /api/v1/admin/showcases` - 晒单列表
- `GET /api/v1/admin/showcases/stats` - 基础统计
- `POST /api/v1/admin/showcases` - 手动创建晒单
- `GET /api/v1/admin/showcases/:id` - 晒单详情
- `POST /api/v1/admin/showcases/:id/approve` - 审核通过
- `POST /api/v1/admin/showcases/:id/reject` - 审核拒绝
- `POST /api/v1/admin/showcases/:id/hide` - 隐藏晒单
- `POST /api/v1/admin/showcases/:id/pin` - 置顶/取消置顶
- `PATCH /api/v1/admin/showcases/:id/priority` - 设置优先级
- `DELETE /api/v1/admin/showcases/:id` - 删除晒单

### 评论管理（已有功能）
- `GET /api/v1/admin/showcases/comments` - 所有评论列表
- `GET /api/v1/admin/showcases/:id/comments` - 指定晒单的评论
- `DELETE /api/v1/admin/showcases/comments/:id` - 硬删除评论

### 分享管理（已有功能）
- `GET /api/v1/admin/showcases/:id/shares` - 指定晒单的分享记录
- `GET /api/v1/admin/showcases/analytics/shares` - 全局分享统计

### 验证标识管理（已有功能）
- `POST /api/v1/admin/showcases/:id/verify` - 设置验证标识
- `POST /api/v1/admin/showcases/:id/unverify` - 取消验证标识

### 中奖晒单管理（已有功能）
- `GET /api/v1/admin/showcases/winners` - 中奖晒单列表
- `POST /api/v1/admin/showcases/:id/toggle-winner-badge` - 切换中奖标识

### 新增功能端点

#### 高级筛选
- `GET /api/v1/admin/showcases/advanced-search` - 高级搜索

#### 批量操作
- `POST /api/v1/admin/showcases/batch-approve` - 批量审核通过
- `POST /api/v1/admin/showcases/batch-reject` - 批量拒绝
- `POST /api/v1/admin/showcases/batch-hide` - 批量隐藏
- `DELETE /api/v1/admin/showcases/batch-delete` - 批量删除
- `POST /api/v1/admin/showcases/batch-verify` - 批量验证
- `POST /api/v1/admin/showcases/batch-pin` - 批量置顶
- `POST /api/v1/admin/showcases/batch-unpin` - 批量取消置顶

#### 评论高级管理
- `GET /api/v1/admin/showcases/comments/stats` - 评论统计
- `POST /api/v1/admin/showcases/comments/batch-delete` - 批量删除评论
- `GET /api/v1/admin/showcases/comments/recent` - 最近评论

#### 分享高级分析
- `GET /api/v1/admin/showcases/analytics/shares/platform` - 按平台分析
- `GET /api/v1/admin/showcases/analytics/shares/trend` - 分享趋势
- `GET /api/v1/admin/showcases/analytics/shares/top-shared` - 最受欢迎晒单

#### 用户行为分析
- `GET /api/v1/admin/showcases/users/:userId/activity` - 用户活动详情
- `GET /api/v1/admin/showcases/users/top-contributors` - 最活跃用户

#### 内容审核工具
- `GET /api/v1/admin/showcases/moderation/pending-review` - 待审核列表
- `GET /api/v1/admin/showcases/moderation/flagged` - 异常内容

#### 实时监控
- `GET /api/v1/admin/showcases/dashboard/overview` - 仪表盘总览
- `GET /api/v1/admin/showcases/dashboard/recent-activity` - 最近活动

---

## 使用场景示例

### 场景 1: 内容审核工作流
```bash
# 1. 查看待审核列表
GET /api/v1/admin/showcases/moderation/pending-review?limit=50

# 2. 批量审核通过优质内容
POST /api/v1/admin/showcases/batch-approve
Body: {"ids": [1, 2, 3, 4, 5]}

# 3. 批量拒绝不合规内容
POST /api/v1/admin/showcases/batch-reject
Body: {"ids": [6, 7, 8], "reason": "图片不清晰"}
```

### 场景 2: 数据分析报告
```bash
# 1. 获取仪表盘总览
GET /api/v1/admin/showcases/dashboard/overview

# 2. 分析分享平台分布
GET /api/v1/admin/showcases/analytics/shares/platform?startDate=2025-01-01&endDate=2025-01-31

# 3. 查看分享趋势
GET /api/v1/admin/showcases/analytics/shares/trend?days=30

# 4. 找出最活跃用户
GET /api/v1/admin/showcases/users/top-contributors?limit=20
```

### 场景 3: 优质内容推荐
```bash
# 1. 搜索高质量晒单
GET /api/v1/admin/showcases/advanced-search?
  status=APPROVED&
  minLikes=100&
  minComments=20&
  startDate=2025-01-01

# 2. 批量设置验证标识
POST /api/v1/admin/showcases/batch-verify
Body: {"ids": [10, 20, 30], "verificationNote": "高质量内容"}

# 3. 批量置顶
POST /api/v1/admin/showcases/batch-pin
Body: {"ids": [10, 20, 30]}
```

### 场景 4: 用户行为监控
```bash
# 1. 查看某个用户的活动
GET /api/v1/admin/showcases/users/user123/activity

# 2. 查看该用户的所有晒单
GET /api/v1/admin/showcases/advanced-search?userId=user123

# 3. 检测异常活动
GET /api/v1/admin/showcases/moderation/flagged
```

---

## 技术实现要点

### 1. 批量操作优化
- 使用 TypeORM 的 `In()` 操作符实现批量更新
- 使用事务保证批量删除评论时计数器的准确性

### 2. 高级搜索优化
- 使用 QueryBuilder 构建复杂查询
- 支持 JSONB 字段查询（媒体类型）
- 使用 ILIKE 实现大小写不敏感的关键词搜索

### 3. 统计分析优化
- 使用数据库聚合函数（COUNT, SUM, GROUP BY）
- 避免 N+1 查询问题
- 合理使用索引提升查询性能

### 4. 实时监控
- 使用日期范围查询监控最近活动
- 缓存仪表盘数据（可选，降低数据库压力）

---

## 权限要求

所有端点都需要：
- `@ApiBearerAuth()` - Bearer Token 认证
- 管理员权限（通过 AdminJwtGuard）

---

## 性能优化建议

1. **缓存策略**: 对仪表盘总览、统计数据等实施 Redis 缓存（5-10分钟）
2. **索引优化**: 确保以下字段建立索引：
   - `status`, `createdAt`, `isWinnerShowcase`, `isVerified`, `isPinned`
   - `likeCount`, `commentCount`, `shareCount`
3. **分页限制**: 所有列表接口强制分页，默认 limit=20，最大 limit=100
4. **异步处理**: 批量操作超过 100 条时，考虑使用队列异步处理

---

## 前端集成建议

### 管理后台页面结构
```
/admin
  /showcases
    /list              # 晒单列表（带高级筛选）
    /pending           # 待审核
    /flagged           # 异常内容
    /analytics         # 数据分析
      /overview        # 总览仪表盘
      /shares          # 分享分析
      /users           # 用户分析
    /comments          # 评论管理
```

### 批量操作 UI 建议
- 列表页面支持多选
- 顶部工具栏显示批量操作按钮
- 确认对话框（删除、拒绝等操作）
- 操作结果提示

### 数据可视化建议
- 使用图表库（如 Chart.js, ECharts）展示趋势
- 饼图展示平台分布
- 折线图展示分享趋势
- 排行榜展示最活跃用户

---

## 后续优化方向

1. **导出功能**: 支持导出晒单数据为 CSV/Excel
2. **自动审核**: 基于规则的自动审核（敏感词、重复内容）
3. **举报系统**: 用户举报功能，管理员处理举报
4. **内容标签**: 为晒单打标签，便于分类和推荐
5. **定时任务**: 自动隐藏过期内容、清理已删除评论
6. **Webhook**: 审核通过/拒绝时通知用户
7. **AI 辅助**: 使用 AI 检测不当内容、自动分类

---

## 结语

本次增强为晒单管理后台提供了强大的管理和分析能力，使管理员能够：
- 高效处理大量内容审核
- 深入了解用户行为和内容表现
- 快速发现和处理异常情况
- 做出数据驱动的运营决策

所有功能都经过精心设计，注重性能和用户体验，为平台的健康发展提供坚实的技术支撑。
