# 晒单系统管理员使用指南

本文档面向管理员，介绍晒单系统的后台管理功能，包括审核、评论管理、分享统计和验证标识等。

## 目录

- [管理面板概览](#管理面板概览)
- [晒单审核](#晒单审核)
- [评论管理](#评论管理)
- [分享统计](#分享统计)
- [中奖晒单管理](#中奖晒单管理)
- [验证标识管理](#验证标识管理)
- [运营功能](#运营功能)
- [API 参考](#api-参考)

---

## 管理面板概览

### 访问路径

管理后台地址：`/admin/showcases`

所有管理端点都需要管理员权限（`AdminJwtGuard`）。

### 核心功能模块

1. **晒单审核** - 审核用户提交的晒单（通过/拒绝/隐藏）
2. **评论管理** - 管理评论内容，删除违规评论
3. **分享统计** - 查看分享数据和平台分布
4. **中奖晒单** - 管理中奖用户的晒单，设置验证标识
5. **运营功能** - 置顶、优先级设置、手动创建晒单

---

## 晒单审核

### 1. 获取待审核列表

#### 端点

```http
GET /api/v1/admin/showcases?status=PENDING&page=1&limit=20
```

#### 参数

| 参数   | 类型   | 说明                                      |
| ------ | ------ | ----------------------------------------- |
| status | string | 筛选状态：PENDING/APPROVED/REJECTED/HIDDEN |
| userId | string | 筛选特定用户的晒单（可选）                |
| page   | number | 页码，默认 1                              |
| limit  | number | 每页数量，默认 20                         |

#### 响应示例

```json
{
  "data": [
    {
      "id": 123,
      "userId": "user_123",
      "userName": "张三",
      "userAvatar": "https://...",
      "content": "我的晒单内容",
      "media": [
        {
          "type": "IMAGE",
          "url": "https://...",
          "cloudflareId": "abc123"
        }
      ],
      "status": "PENDING",
      "likeCount": 0,
      "commentCount": 0,
      "shareCount": 0,
      "createdAt": "2025-01-28T10:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### 2. 审核操作

#### 通过审核

```http
POST /api/v1/admin/showcases/:id/approve
```

晒单将显示在用户端晒单列表中。

#### 拒绝审核

```http
POST /api/v1/admin/showcases/:id/reject
Content-Type: application/json

{
  "reason": "内容违规/图片不符合规范/其他原因"
}
```

用户会收到拒绝原因通知。

#### 隐藏晒单

```http
POST /api/v1/admin/showcases/:id/hide
```

已通过的晒单可以隐藏（不删除，但用户端不可见）。

### 3. 删除晒单

```http
DELETE /api/v1/admin/showcases/:id
```

**注意**：删除操作不可恢复，建议优先使用"隐藏"功能。

### 4. 审核流程建议

**标准审核流程**：

1. **内容审查**
   - 检查文字内容是否合规（无违禁词、不涉政、不违法）
   - 检查是否存在广告、引流行为
   - 检查是否包含敏感信息（联系方式、外部链接）

2. **图片/视频审查**
   - 图片清晰度是否符合要求
   - 是否包含水印或其他平台 Logo
   - 内容是否与商品相关
   - 是否存在低俗、暴力、违规内容

3. **真实性验证**
   - 中奖晒单：验证是否真实中奖用户
   - 实物奖品：对比发货地址与晒单内容
   - 可疑账号：检查用户历史行为

**快速审核快捷键建议**：

```
通过: Ctrl/Cmd + Y
拒绝: Ctrl/Cmd + N
隐藏: Ctrl/Cmd + H
下一条: →
上一条: ←
```

---

## 评论管理

### 1. 获取所有评论

#### 全局评论列表

```http
GET /api/v1/admin/showcases/comments?page=1&limit=50
```

#### 特定晒单的评论

```http
GET /api/v1/admin/showcases/:showcaseId/comments?page=1&limit=20
```

#### 响应示例

```json
{
  "items": [
    {
      "id": 456,
      "showcaseId": 123,
      "userId": "user_456",
      "userName": "李四",
      "userAvatar": "https://...",
      "content": "恭喜恭喜！",
      "parentId": null,
      "replyToUserId": null,
      "isDeleted": false,
      "createdAt": "2025-01-28T11:00:00Z"
    }
  ],
  "total": 200,
  "page": 1,
  "limit": 50
}
```

### 2. 删除评论

```http
DELETE /api/v1/admin/showcases/comments/:commentId
```

**区别于用户删除**：

- 用户删除 → 软删除（`isDeleted = true`），评论仍保留在数据库
- 管理员删除 → 硬删除，完全从数据库删除，同时会更新 `commentCount`

**何时删除评论**：

- 包含辱骂、攻击性语言
- 垃圾广告、引流信息
- 违禁词、敏感内容
- 恶意刷屏

### 3. 批量管理（建议实现）

虽然 API 不直接支持批量删除，但可以在前端实现批量选择 + 循环调用删除：

```typescript
async function bulkDeleteComments(commentIds: number[]) {
  const results = await Promise.allSettled(
    commentIds.map(id =>
      axios.delete(`/api/v1/admin/showcases/comments/${id}`)
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  const failed = results.filter(r => r.status === 'rejected').length;

  console.log(`成功删除 ${succeeded} 条，失败 ${failed} 条`);
}
```

---

## 分享统计

### 1. 晒单分享记录

查看特定晒单的分享明细：

```http
GET /api/v1/admin/showcases/:showcaseId/shares?page=1&limit=20
```

#### 响应示例

```json
{
  "items": [
    {
      "id": 789,
      "showcaseId": 123,
      "userId": "user_789",
      "platform": "TWITTER",
      "shareUrl": "https://yoho.com/showcase/123?ref=user_789",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "createdAt": "2025-01-28T12:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20
}
```

### 2. 全局分享统计

```http
GET /api/v1/admin/showcases/analytics/shares
```

#### 响应示例

```json
{
  "totalShares": 5000,
  "platformBreakdown": {
    "TWITTER": 2000,
    "TELEGRAM": 1500,
    "FACEBOOK": 800,
    "LINK": 600,
    "OTHER": 100
  },
  "topSharedShowcases": [
    {
      "showcaseId": 123,
      "shareCount": 150,
      "productName": "iPhone 15 Pro"
    }
  ],
  "dailyTrend": [
    {
      "date": "2025-01-27",
      "count": 120
    },
    {
      "date": "2025-01-28",
      "count": 85
    }
  ]
}
```

### 3. 数据应用

**运营洞察**：

- **平台偏好**：用户更倾向哪个平台分享？
- **爆款晒单**：哪些晒单分享量最高？
- **传播趋势**：分享量的日/周/月趋势
- **用户参与**：高分享用户识别与激励

**优化建议**：

```typescript
// 根据分享数据调整运营策略
if (twitterShares > telegramShares * 2) {
  // Twitter 更受欢迎，加大 Twitter 运营投入
  console.log('重点运营 Twitter 分享渠道');
}

// 识别高价值晒单
const viralShowcases = topSharedShowcases.filter(s => s.shareCount > 100);
// 考虑置顶或推荐到首页
```

---

## 中奖晒单管理

### 1. 获取中奖晒单列表

```http
GET /api/v1/admin/showcases/winners?page=1&limit=20
```

仅返回 `isWinnerShowcase = true` 的晒单。

#### 响应示例

```json
{
  "data": [
    {
      "id": 123,
      "userId": "user_123",
      "userName": "张三",
      "drawResultId": 456,
      "isWinnerShowcase": true,
      "winningNumber": 888,
      "prizeType": "PHYSICAL",
      "prizeValue": "999.00",
      "shippingAddressSnapshot": {
        "recipientName": "张三",
        "phoneNumber": "138****5678",
        "country": "中国",
        "state": "广东省",
        "city": "深圳市",
        "streetAddress": "南山区科技园",
        "apartment": "1001",
        "zipCode": "518000",
        "fullAddress": "中国广东省深圳市南山区科技园 1001"
      },
      "isVerified": true,
      "verificationNote": "官方认证",
      "createdAt": "2025-01-28T10:00:00Z"
    }
  ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### 2. 切换中奖标识

```http
POST /api/v1/admin/showcases/:id/toggle-winner-badge
```

手动开启/关闭中奖标识（用于纠正错误标记的晒单）。

#### 响应

```json
{
  "success": true,
  "isWinnerShowcase": false
}
```

### 3. 实物奖品发货管理

对于 `prizeType = PHYSICAL` 的中奖晒单：

1. 查看 `shippingAddressSnapshot` 获取收货地址
2. 安排发货
3. 可在备注中记录物流单号（需扩展字段）

**建议字段扩展**：

```typescript
// 未来可添加
interface Showcase {
  // ...
  shippingInfo?: {
    carrier: string;        // 物流公司
    trackingNumber: string; // 物流单号
    shippedAt: Date;        // 发货时间
    deliveredAt: Date;      // 签收时间
    status: 'PENDING' | 'SHIPPED' | 'DELIVERED';
  };
}
```

---

## 验证标识管理

验证标识（蓝色认证徽章）用于标记官方认证的晒单，提升可信度。

### 1. 设置验证标识

```http
POST /api/v1/admin/showcases/:id/verify
Content-Type: application/json

{
  "verificationNote": "官方认证 - 2025年1月大奖得主"
}
```

#### 参数

| 参数              | 类型   | 说明                             |
| ----------------- | ------ | -------------------------------- |
| verificationNote  | string | 验证备注（可选，默认"官方认证"） |

#### 效果

- `isVerified = true`
- `verifiedAt = 当前时间`
- 用户端显示蓝色认证徽章

### 2. 取消验证标识

```http
POST /api/v1/admin/showcases/:id/unverify
```

将 `isVerified` 设为 `false`，移除徽章。

### 3. 验证标准建议

**何时设置验证标识**：

1. **大奖得主**
   - 奖品价值 > $1000
   - 平台重要活动中奖用户
   - 需要官方背书的高价值晒单

2. **优质内容**
   - 图片精美、内容详实
   - 有教育意义或参考价值
   - 希望推广的示范晒单

3. **KOL/合作伙伴**
   - 官方合作的网红、达人
   - 品牌合作方的晒单
   - 需要特殊标识的账号

**操作流程**：

```
1. 审核团队提名候选晒单
2. 运营负责人审批
3. 管理员执行设置验证标识
4. 在验证备注中记录原因（如"2025年1月最佳晒单"）
```

---

## 运营功能

### 1. 置顶晒单

```http
POST /api/v1/admin/showcases/:id/pin
```

**效果**：

- 晒单在列表中置顶显示
- 再次调用可取消置顶

#### 响应

```json
{
  "success": true,
  "isPinned": true
}
```

**使用场景**：

- 首页推荐位
- 活动期间的示范晒单
- 官方活动公告

### 2. 设置优先级

```http
PATCH /api/v1/admin/showcases/:id/priority
Content-Type: application/json

{
  "priority": 100
}
```

**优先级规则**：

- 数值越大，优先级越高
- 列表按 `priority DESC, createdAt DESC` 排序
- 默认优先级 = 0

**推荐值**：

```
1000+ : 特别推荐（首页轮播）
500-999: 热门推荐
100-499: 优质内容
1-99  : 普通推荐
0     : 默认
-1    : 降权（减少曝光）
```

### 3. 手动创建晒单

```http
POST /api/v1/admin/showcases
Content-Type: application/json

{
  "userId": "user_123",
  "userName": "官方账号",
  "userAvatar": "https://...",
  "content": "官方活动晒单",
  "media": [
    {
      "type": "IMAGE",
      "url": "https://...",
      "cloudflareId": "abc123"
    }
  ],
  "productId": 1,
  "prizeInfo": "iPhone 15 Pro"
}
```

**状态**：管理员创建的晒单自动 `status = APPROVED`。

**使用场景**：

- 官方活动示范
- 补发用户误删的晒单
- 测试数据

---

## 统计面板

### 1. 晒单统计概览

```http
GET /api/v1/admin/showcases/stats
```

#### 响应

```json
{
  "pending": 15,    // 待审核
  "approved": 250,  // 已通过
  "rejected": 30,   // 已拒绝
  "total": 295      // 总数
}
```

### 2. 数据看板建议

**管理后台首页展示**：

```typescript
interface DashboardStats {
  // 晒单统计
  showcases: {
    pending: number;      // 待审核数（高亮显示）
    approved: number;     // 已通过
    rejected: number;     // 已拒绝
    todayNew: number;     // 今日新增
  };

  // 评论统计
  comments: {
    total: number;        // 总评论数
    todayNew: number;     // 今日新增
  };

  // 分享统计
  shares: {
    total: number;        // 总分享数
    todayNew: number;     // 今日新增
    topPlatform: string;  // 最受欢迎平台
  };

  // 中奖晒单
  winners: {
    total: number;        // 中奖晒单总数
    verified: number;     // 已认证数
    pending: number;      // 待处理
  };
}
```

---

## 工作流程示例

### 每日审核流程

```
08:00 - 打开管理后台，查看待审核数量
08:30 - 开始审核晒单
        ├─ 通过符合规范的晒单
        ├─ 拒绝违规内容（附理由）
        └─ 标记可疑晒单待复核

10:00 - 审核评论
        └─ 删除垃圾评论、违规内容

11:00 - 查看中奖晒单
        ├─ 验证真实性
        ├─ 设置验证标识（大奖）
        └─ 记录发货信息

15:00 - 运营操作
        ├─ 选择优质晒单置顶
        ├─ 调整优先级
        └─ 更新推荐位

17:00 - 查看统计数据
        └─ 导出日报
```

### 活动期间特殊流程

```
活动前：
  └─ 创建官方示范晒单（设置 priority = 1000）

活动中：
  ├─ 提高审核频率（每2小时审核一次）
  ├─ 优先审核中奖晒单
  └─ 实时监控分享数据

活动后：
  ├─ 评选最佳晒单（设置验证标识）
  ├─ 生成活动报告
  └─ 归档活动数据
```

---

## API 参考

### 晒单管理

| 端点                                 | 方法   | 说明           |
| ------------------------------------ | ------ | -------------- |
| `/api/v1/admin/showcases`            | GET    | 获取晒单列表   |
| `/api/v1/admin/showcases/stats`      | GET    | 获取统计数据   |
| `/api/v1/admin/showcases`            | POST   | 手动创建晒单   |
| `/api/v1/admin/showcases/:id`        | GET    | 获取晒单详情   |
| `/api/v1/admin/showcases/:id`        | DELETE | 删除晒单       |
| `/api/v1/admin/showcases/:id/approve`| POST   | 审核通过       |
| `/api/v1/admin/showcases/:id/reject` | POST   | 审核拒绝       |
| `/api/v1/admin/showcases/:id/hide`   | POST   | 隐藏晒单       |
| `/api/v1/admin/showcases/:id/pin`    | POST   | 置顶/取消置顶  |
| `/api/v1/admin/showcases/:id/priority`| PATCH | 设置优先级     |

### 评论管理

| 端点                                      | 方法   | 说明                 |
| ----------------------------------------- | ------ | -------------------- |
| `/api/v1/admin/showcases/comments`        | GET    | 获取所有评论列表     |
| `/api/v1/admin/showcases/:id/comments`    | GET    | 获取指定晒单的评论   |
| `/api/v1/admin/showcases/comments/:id`    | DELETE | 硬删除评论           |

### 分享统计

| 端点                                      | 方法   | 说明                 |
| ----------------------------------------- | ------ | -------------------- |
| `/api/v1/admin/showcases/:id/shares`      | GET    | 获取指定晒单分享记录 |
| `/api/v1/admin/showcases/analytics/shares`| GET    | 获取全局分享统计     |

### 中奖晒单

| 端点                                            | 方法   | 说明             |
| ----------------------------------------------- | ------ | ---------------- |
| `/api/v1/admin/showcases/winners`               | GET    | 获取中奖晒单列表 |
| `/api/v1/admin/showcases/:id/toggle-winner-badge`| POST  | 切换中奖标识     |

### 验证标识

| 端点                                  | 方法   | 说明             |
| ------------------------------------- | ------ | ---------------- |
| `/api/v1/admin/showcases/:id/verify`  | POST   | 设置验证标识     |
| `/api/v1/admin/showcases/:id/unverify`| POST   | 取消验证标识     |

---

## 权限控制

所有管理端点都需要 `AdminJwtGuard`，确保只有管理员可访问。

### 管理员登录

```http
POST /api/v1/admin/auth/login
Content-Type: application/json

{
  "googleToken": "xxx" // Google OAuth token
}
```

### 请求头

```http
Authorization: Bearer <admin-jwt-token>
```

---

## 最佳实践

### 1. 审核效率

- **批量审核**：一次审核多条晒单，减少切换
- **快捷键**：设置常用操作的快捷键
- **自动过滤**：优先审核高风险内容（大量评论、高分享）

### 2. 数据安全

- **备份**：删除前确认，重要晒单先备份
- **日志**：记录所有管理操作（谁、何时、做了什么）
- **权限分级**：普通管理员只能审核，高级管理员可删除

### 3. 用户体验

- **及时审核**：晒单提交后 2 小时内完成审核
- **清晰理由**：拒绝时提供具体原因
- **申诉机制**：允许用户对拒绝结果申诉

### 4. 运营策略

- **内容激励**：定期评选优质晒单，给予奖励
- **数据驱动**：根据分享数据优化推荐算法
- **社区建设**：鼓励互动（评论、点赞、分享）

---

## 常见问题

### Q: 误删晒单如何恢复？

A: 硬删除无法恢复，建议：
1. 优先使用"隐藏"而非"删除"
2. 定期备份数据库
3. 实现软删除 + 回收站功能

### Q: 如何批量导出晒单数据？

A: 可通过数据库直接导出：

```sql
-- 导出所有已通过的晒单
SELECT * FROM yoho_showcase
WHERE status = 'APPROVED'
ORDER BY created_at DESC;

-- 导出中奖晒单
SELECT * FROM yoho_showcase
WHERE is_winner_showcase = true;
```

### Q: 评论违规如何处理用户？

A: 建议扩展用户违规记录系统：

```typescript
interface UserViolation {
  userId: string;
  type: 'SPAM' | 'ABUSE' | 'ILLEGAL';
  count: number;
  lastViolation: Date;
}

// 超过阈值自动禁言/封号
if (violation.count >= 3) {
  banUser(violation.userId);
}
```

### Q: 如何防止刷量（刷赞、刷分享）？

A: 后端已有基础防护：
- Transaction 保证计数准确
- IP + User Agent 记录（可用于检测异常）

建议增强：
- 限流：同一用户对同一晒单每小时只能点赞1次
- 异常检测：短时间内大量操作标记为可疑
- 验证码：高频操作要求验证

---

## 联系支持

如需帮助或报告问题，请联系技术团队。

**文档版本**：v1.0
**最后更新**：2025-01-28
