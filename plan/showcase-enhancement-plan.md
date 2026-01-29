# 实施计划：晒单功能增强（评论系统 + 分享功能 + 中奖关联）

> **项目状态**: ✅ **已完成** (2025-01-28)
>
> 所有计划功能已实现并通过编译测试。详细总结请查看 [项目总结文档](../docs/showcase-enhancement-summary.md)

## 需求概述

为现有的晒单(Showcase)系统添加以下功能：
1. **评论系统** - 支持评论和嵌套回复
2. **分享功能** - 记录分享行为和统计数据
3. **点赞功能** - 保持现有实现（已完善）
4. **中奖关联** - 将晒单与抽奖中奖记录关联

## 现有基础

### 已实现功能
- ✅ ShowcaseLike 点赞系统（transaction-based, 带计数器）
- ✅ Showcase 实体（包含 productId, drawRoundId, prizeInfo）
- ✅ DrawResult 中奖记录（包含 winnerUserId, prizeValue, prizeType）
- ✅ 用户快照模式（denormalized userName, userAvatar）
- ✅ Admin 审核系统（status: PENDING/APPROVED/REJECTED/HIDDEN）

### 现有模式参考
```typescript
// 点赞系统模式（将被评论和分享系统复用）
- Entity: ShowcaseLike (unique constraint: showcaseId + userId)
- Service: toggleLike() 使用 transaction 更新计数器
- Counter: likeCount 存储在 Showcase 实体中
- Controller: POST /api/v1/showcase/:id/like
```

## 数据库设计

### 1. ShowcaseComment 表（评论系统）

**文件**: `src/api-modules/ecommerce/entities/showcase-comment.entity.ts`

```typescript
@Entity('yoho_showcase_comment')
@Tree('materialized-path') // 支持嵌套回复
export class ShowcaseComment {
  id: number (PK)
  showcaseId: number (FK -> Showcase, indexed)
  userId: string (indexed)
  userName: string (快照)
  userAvatar: string (快照)
  content: text (最大500字符)
  parentId: number (FK -> ShowcaseComment, nullable)
  replyToUserId: string (nullable, 用于@提及)
  replyToUserName: string (nullable)
  isDeleted: boolean (软删除)
  deletedAt: timestamp (nullable)
  createdAt: timestamp
  updatedAt: timestamp
}
```

**索引**:
- `(showcaseId, createdAt)` - 分页查询
- `userId` - 用户评论列表
- `parentId` - 查找子回复
- `(isDeleted, showcaseId)` - 过滤已删除评论

### 2. ShowcaseShare 表（分享功能）

**文件**: `src/api-modules/ecommerce/entities/showcase-share.entity.ts`

```typescript
@Entity('yoho_showcase_share')
export class ShowcaseShare {
  id: number (PK)
  showcaseId: number (FK -> Showcase, indexed)
  userId: string (indexed)
  platform: enum (TWITTER, TELEGRAM, FACEBOOK, LINK, OTHER)
  shareUrl: string (nullable)
  userAgent: string (nullable)
  ipAddress: string (nullable)
  createdAt: timestamp
}
```

**索引**:
- `(showcaseId, createdAt)` - 分页查询
- `userId` - 用户分享记录
- `(platform, createdAt)` - 平台统计

### 3. Showcase 表更新

**文件**: `src/api-modules/ecommerce/entities/showcase.entity.ts`

**新增字段**:
```typescript
// 互动计数
commentCount: number (default: 0)
shareCount: number (default: 0)

// 中奖关联
drawResultId: number (FK -> DrawResult, nullable, indexed)
isWinnerShowcase: boolean (default: false, indexed)

// 中奖信息快照（denormalized from DrawResult）
winningNumber: number (nullable)
prizeType: string (nullable, CASH/CRYPTO/PHYSICAL)
prizeValue: decimal(18,2) (nullable)

// 实物奖品发货地址快照（针对 PHYSICAL 奖品）
shippingAddressSnapshot: json (nullable) {
  recipientName: string
  phoneNumber: string
  country: string
  state: string
  city: string
  streetAddress: string
  apartment: string
  zipCode: string
  fullAddress: string
}

// 验证标识（用于展示官方认证）
isVerified: boolean (default: false)
verifiedAt: timestamp (nullable)
verificationNote: string (nullable, max 255) // 验证备注
```

## 服务层实现

### ShowcaseCommentService

**文件**: `src/api-modules/ecommerce/services/showcase-comment.service.ts`

**核心方法**:

```typescript
// 创建评论（使用 transaction 更新 commentCount）
async create(showcaseId, userId, content, parentId?, replyToUserId?): Promise<ShowcaseComment>

// 获取晒单的评论列表（带分页）
async findByShowcase(showcaseId, page, limit): Promise<PaginatedResult>

// 获取评论的回复列表
async findReplies(commentId, page, limit): Promise<PaginatedResult>

// 删除评论（软删除，transaction 更新计数）
async delete(commentId, userId): Promise<void>

// Admin：硬删除评论
async adminDelete(commentId): Promise<void>
```

**实现模式**（参考 ShowcaseService.toggleLike）:
```typescript
async create(showcaseId, userId, content, parentId?) {
  return await this.dataSource.transaction(async (manager) => {
    // 1. 获取用户信息快照
    const user = await this.userService.getUser(userId);

    // 2. 创建评论
    const comment = manager.create(ShowcaseComment, {
      showcaseId, userId,
      userName: user.nickname || user.username,
      userAvatar: user.botimAvatar,
      content, parentId
    });
    await manager.save(comment);

    // 3. 更新计数器
    await manager.increment(Showcase, { id: showcaseId }, 'commentCount', 1);

    return comment;
  });
}
```

### ShowcaseShareService

**文件**: `src/api-modules/ecommerce/services/showcase-share.service.ts`

**核心方法**:

```typescript
// 记录分享（transaction 更新 shareCount）
async recordShare(showcaseId, userId, platform, metadata?): Promise<ShareResult>

// 生成分享数据（标题、描述、图片）
async generateShareData(showcaseId): Promise<ShareData>

// 获取分享统计
async getShareStats(showcaseId): Promise<ShareStats>
```

### ShowcaseService 更新

**文件**: `src/api-modules/ecommerce/services/showcase.service.ts`

**新增方法**:

```typescript
// 从中奖记录创建晒单
async createFromDrawResult(userId, drawResultId, dto): Promise<Showcase>

// 验证用户是否是中奖者
async canCreateWinnerShowcase(userId, drawResultId): Promise<boolean>

// 获取中奖晒单列表
async findWinnerShowcases(query): Promise<PaginatedResult>

// Admin: 设置/取消验证标识
async toggleVerified(showcaseId, verificationNote?): Promise<Showcase>
```

**修改方法**:
- `findOne()` - 添加 commentCount, shareCount, winner 详情, verified 状态
- `findAll()` - 添加 commentCount, shareCount, isVerified
- `create()` - 支持 drawResultId 参数，自动填充中奖信息和地址快照

### DrawService 集成

**文件**: `src/api-modules/ecommerce/services/draw.service.ts`

**新增方法**:

```typescript
// 中奖后通知用户创建晒单
async notifyWinnerForShowcase(drawResultId): Promise<void>

// 获取当前用户的中奖历史列表（用于创建晒单时选择）
async getMyWinningHistory(userId, page, limit): Promise<{
  items: Array<{
    drawResultId: number
    drawRoundId: number
    productId: number
    productName: string
    productImage: string
    winningNumber: number
    prizeType: PrizeType
    prizeValue: Decimal
    prizeStatus: PrizeStatus
    wonAt: Date
    hasShowcase: boolean  // 是否已创建晒单
    shippingAddress?: ShippingAddress  // 实物奖品地址
  }>
  total: number
  page: number
  limit: number
}>

// 获取中奖记录详情用于晒单创建
async getDrawResultForShowcase(drawResultId, userId): Promise<DrawResult | null>
```

## API 端点

### 用户端点（ShowcaseController）

**文件**: `src/api-modules/ecommerce/controllers/showcase.controller.ts`

#### 评论相关
```
POST   /api/v1/showcase/:id/comments          创建评论
GET    /api/v1/showcase/:id/comments          获取评论列表（分页）
GET    /api/v1/showcase/comments/:id/replies  获取回复列表（分页）
DELETE /api/v1/showcase/comments/:id          删除自己的评论
```

#### 分享相关
```
POST   /api/v1/showcase/:id/share             记录分享
GET    /api/v1/showcase/:id/share-data        获取分享数据
```

#### 中奖晒单
```
POST   /api/v1/showcase/winner                创建中奖晒单（从中奖历史选择）
GET    /api/v1/showcase/winners               获取中奖晒单列表
```

### 用户端点（DrawController）

**文件**: `src/api-modules/ecommerce/controllers/draw.controller.ts`

#### 中奖历史
```
GET    /api/v1/draw/my-wins                   获取我的中奖历史（用于创建晒单）
GET    /api/v1/draw/my-wins/:drawResultId     获取中奖详情
```

### 管理端点（AdminShowcaseController）

**文件**: `src/api-modules/admin/controllers/admin-showcase.controller.ts`

```
GET    /api/v1/admin/showcases/comments       所有评论列表
DELETE /api/v1/admin/showcases/comments/:id   删除评论（硬删除）
GET    /api/v1/admin/showcases/:id/comments   获取指定晒单的评论
GET    /api/v1/admin/showcases/:id/shares     分享记录
GET    /api/v1/admin/showcases/analytics/shares 分享统计
GET    /api/v1/admin/showcases/winners        中奖晒单管理
POST   /api/v1/admin/showcases/:id/toggle-winner-badge 切换中奖标识
POST   /api/v1/admin/showcases/:id/verify     设置验证标识（官方认证）
POST   /api/v1/admin/showcases/:id/unverify   取消验证标识
```

## 模块更新

### EcommerceModule

**文件**: `src/api-modules/ecommerce/ecommerce.module.ts`

```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([
      // ... 现有实体
      ShowcaseComment,      // 新增
      ShowcaseShare,        // 新增
    ]),
    // ... 其他模块
  ],
  providers: [
    // ... 现有服务
    ShowcaseCommentService, // 新增
    ShowcaseShareService,   // 新增
  ],
  exports: [
    // ... 现有导出
    ShowcaseCommentService, // 新增
    ShowcaseShareService,   // 新增
  ],
})
```

### AdminModule

**文件**: `src/api-modules/admin/admin.module.ts`

```typescript
TypeOrmModule.forFeature([
  // ... 现有实体
  ShowcaseComment,  // 新增
  ShowcaseShare,    // 新增
])
```

## 数据库迁移

由于项目使用 TypeORM `synchronize: true`，表会自动创建。但建议执行手动迁移以确保数据完整性。

### Migration SQL

```sql
-- 1. 创建评论表
CREATE TABLE yoho_showcase_comment (
  id SERIAL PRIMARY KEY,
  showcase_id INTEGER NOT NULL REFERENCES yoho_showcase(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  user_name VARCHAR(128),
  user_avatar VARCHAR(512),
  content TEXT NOT NULL,
  parent_id INTEGER REFERENCES yoho_showcase_comment(id) ON DELETE CASCADE,
  reply_to_user_id VARCHAR(64),
  reply_to_user_name VARCHAR(128),
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP,
  mpath VARCHAR(255), -- TypeORM materialized-path
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_showcase_comment_showcase_created ON yoho_showcase_comment(showcase_id, created_at);
CREATE INDEX idx_showcase_comment_user ON yoho_showcase_comment(user_id);
CREATE INDEX idx_showcase_comment_parent ON yoho_showcase_comment(parent_id);
CREATE INDEX idx_showcase_comment_deleted ON yoho_showcase_comment(is_deleted, showcase_id);

-- 2. 创建分享表
CREATE TABLE yoho_showcase_share (
  id SERIAL PRIMARY KEY,
  showcase_id INTEGER NOT NULL REFERENCES yoho_showcase(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL,
  platform VARCHAR(20) DEFAULT 'LINK',
  share_url VARCHAR(255),
  user_agent VARCHAR(100),
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_showcase_share_showcase_created ON yoho_showcase_share(showcase_id, created_at);
CREATE INDEX idx_showcase_share_user ON yoho_showcase_share(user_id);
CREATE INDEX idx_showcase_share_platform ON yoho_showcase_share(platform, created_at);

-- 3. 更新晒单表
ALTER TABLE yoho_showcase
ADD COLUMN comment_count INTEGER DEFAULT 0,
ADD COLUMN share_count INTEGER DEFAULT 0,
ADD COLUMN draw_result_id INTEGER REFERENCES yoho_ecommerce_draw_results(id) ON DELETE SET NULL,
ADD COLUMN is_winner_showcase BOOLEAN DEFAULT false,
ADD COLUMN winning_number INTEGER,
ADD COLUMN prize_type VARCHAR(20),
ADD COLUMN prize_value DECIMAL(18, 2),
ADD COLUMN shipping_address_snapshot JSONB,
ADD COLUMN is_verified BOOLEAN DEFAULT false,
ADD COLUMN verified_at TIMESTAMP,
ADD COLUMN verification_note VARCHAR(255);

CREATE INDEX idx_showcase_winner ON yoho_showcase(is_winner_showcase, created_at);
CREATE INDEX idx_showcase_draw_result ON yoho_showcase(draw_result_id);
CREATE INDEX idx_showcase_verified ON yoho_showcase(is_verified, created_at);
```

## DTOs

### 评论 DTOs

**文件**: `src/api-modules/ecommerce/dto/showcase-comment.dto.ts`

```typescript
export class CreateCommentDto {
  content: string (max 500)
  parentId?: number
  replyToUserId?: string
}

export class CommentQueryDto {
  page?: number = 1
  limit?: number = 20
}

export class CommentResponseDto {
  id, showcaseId, userId, userName, userAvatar
  content, parentId, replyToUserId, replyToUserName
  replyCount, createdAt, updatedAt
  replies?: CommentResponseDto[]
}
```

### 分享 DTOs

**文件**: `src/api-modules/ecommerce/dto/showcase-share.dto.ts`

```typescript
export class CreateShareDto {
  platform: SharePlatform
}

export class ShareDataResponseDto {
  url, title, description, image, shareCount
}
```

### 晒单更新 DTOs

**文件**: `src/api-modules/ecommerce/dto/showcase.dto.ts`

```typescript
export class CreateWinnerShowcaseDto extends CreateShowcaseDto {
  drawResultId: number
}
```

### 中奖历史 DTOs

**文件**: `src/api-modules/ecommerce/dto/draw.dto.ts`

```typescript
export class MyWinningHistoryQueryDto {
  page?: number = 1
  limit?: number = 20
}

export class WinningHistoryItemDto {
  drawResultId: number
  drawRoundId: number
  productId: number
  productName: string
  productImage: string
  winningNumber: number
  prizeType: PrizeType
  prizeValue: Decimal
  prizeStatus: PrizeStatus
  wonAt: Date
  hasShowcase: boolean
  shippingAddress?: {
    recipientName, phoneNumber, country, state,
    city, streetAddress, apartment, zipCode, fullAddress
  }
}
```

## 实施步骤

### Phase 1: 数据库和实体（Day 1）
1. ✅ 创建 `ShowcaseComment` 实体
2. ✅ 创建 `ShowcaseShare` 实体
3. ✅ 更新 `Showcase` 实体（添加新字段）
4. ✅ 创建/运行数据库迁移
5. ✅ 更新实体导出 (`entities/index.ts`)

### Phase 2: 评论系统（Day 2-3）
1. [x] 创建 `ShowcaseCommentService`
2. [x] 创建评论 DTOs
3. [x] 在 `ShowcaseController` 添加评论端点
4. [x] 在 `AdminShowcaseController` 添加管理端点

### Phase 3: 分享系统（Day 3-4）
1. [x] 创建 `ShowcaseShareService`
2. [x] 创建分享 DTOs
3. [x] 在 `ShowcaseController` 添加分享端点
4. [x] 在 `AdminShowcaseController` 添加分析端点

### Phase 4: 中奖关联（Day 4-5）
1. [x] 更新 `ShowcaseService`（winner 方法）
2. [x] 更新 `DrawService`（通知方法）
3. [x] 创建 winner DTOs
4. [x] 添加 winner 端点

### Phase 5: 模块集成（Day 5）
1. [x] 更新 `EcommerceModule`
2. [x] 更新 `AdminModule`
3. [x] 验证依赖注入


### Phase 7: 文档（Day 7）
1. [x] Swagger API 文档
2. [x] 前端集成指南
3. [x] Admin 使用指南

## 验证清单

### 数据库验证
```sql
-- 验证表创建
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('yoho_showcase_comment', 'yoho_showcase_share');

-- 验证索引
SELECT indexname FROM pg_indexes
WHERE tablename IN ('yoho_showcase_comment', 'yoho_showcase_share');

-- 验证 Showcase 新字段
SELECT column_name FROM information_schema.columns
WHERE table_name = 'yoho_showcase'
AND column_name IN ('comment_count', 'share_count', 'draw_result_id');
```

### API 测试

**评论系统**:
- [ ] 创建顶级评论
- [ ] 创建嵌套回复（2-3层）
- [ ] 分页查询评论（page 1, 2, 3）
- [ ] 删除自己的评论（软删除）
- [ ] 验证 commentCount 增减
- [ ] 验证已删除评论不显示
- [ ] Admin 硬删除评论

**分享功能**:
- [ ] 分享到不同平台
- [ ] 验证 shareCount 递增
- [ ] 获取分享数据
- [ ] Admin 分享统计

**中奖晒单**:
- [ ] 获取我的中奖历史列表
- [ ] 从中奖历史创建晒单
- [ ] 验证仅中奖者可创建
- [ ] 验证地址快照正确保存（实物奖品）
- [ ] 获取中奖晒单列表
- [ ] 验证中奖标识显示
- [ ] Admin 设置验证标识
- [ ] Admin 取消验证标识
- [ ] 验证 verified 徽章显示

**性能测试**:
- [ ] 并发创建评论（10个请求）
- [ ] 验证计数器准确性
- [ ] 1000+ 评论的分页性能
- [ ] 嵌套回复查询性能

### 关键文件路径

**新建文件**:
1. `src/api-modules/ecommerce/entities/showcase-comment.entity.ts`
2. `src/api-modules/ecommerce/entities/showcase-share.entity.ts`
3. `src/api-modules/ecommerce/services/showcase-comment.service.ts`
4. `src/api-modules/ecommerce/services/showcase-share.service.ts`
5. `src/api-modules/ecommerce/dto/showcase-comment.dto.ts`
6. `src/api-modules/ecommerce/dto/showcase-share.dto.ts`

**修改文件**:
1. `src/api-modules/ecommerce/entities/showcase.entity.ts` - 添加新字段（地址、验证）
2. `src/api-modules/ecommerce/services/showcase.service.ts` - 添加 winner 方法和 verified 方法
3. `src/api-modules/ecommerce/services/draw.service.ts` - 添加中奖历史方法
4. `src/api-modules/ecommerce/controllers/showcase.controller.ts` - 添加端点
5. `src/api-modules/ecommerce/controllers/draw.controller.ts` - 添加中奖历史端点
6. `src/api-modules/admin/controllers/admin-showcase.controller.ts` - 添加验证端点
7. `src/api-modules/ecommerce/ecommerce.module.ts` - 注册新服务
8. `src/api-modules/admin/admin.module.ts` - 导入新实体
9. `src/api-modules/ecommerce/dto/showcase.dto.ts` - 添加 winner DTOs
10. `src/api-modules/ecommerce/dto/draw.dto.ts` - 添加中奖历史 DTOs

## 技术要点

### Transaction 模式
所有计数器更新必须使用 transaction，参考现有的 `ShowcaseService.toggleLike`:

```typescript
return await this.dataSource.transaction(async (manager) => {
  // 1. 执行主操作
  const comment = manager.create(...);
  await manager.save(comment);

  // 2. 更新计数器
  await manager.increment(Showcase, { id: showcaseId }, 'commentCount', 1);

  return result;
});
```

### 性能优化
- **用户快照**: denormalize userName/userAvatar 避免 JOIN
- **计数器**: 存储在 Showcase 实体，避免 COUNT 查询
- **索引**: 在高频查询字段建立复合索引
- **软删除**: 保留评论线索完整性
- **Tree 结构**: 使用 materialized-path 高效处理嵌套评论

### 安全考虑
- **输入验证**: 评论最大500字符，XSS 过滤
- **授权**: 仅评论作者可删除
- **限流**: 10 请求/分钟/用户（评论和分享）
- **中奖验证**: 创建 winner showcase 前验证用户身份

## 前端集成建议

### 分享 URL 格式
```
https://yoho.com/showcase/{id}?ref={userId}&platform={platform}
```

### WebSocket（可选）
实时评论通知（可后续添加）

### 中奖晒单提示
- DrawResult 创建后，前端显示 Banner 鼓励用户创建晒单
- 用户点击后跳转到中奖历史页面，选择要晒单的中奖记录
- 对于实物奖品（PHYSICAL），显示收货地址信息

### 验证徽章显示
- isVerified=true 的晒单显示蓝色认证徽章
- 鼠标悬停显示 verificationNote（如"官方认证"）
- 在晒单列表和详情页都显示

### 地址显示
- 实物奖品的中奖晒单显示收货地址
- 格式：{country}, {state}, {city}, {streetAddress}
- 部分敏感信息可脱敏处理（电话号码）

## 完成标准

1. ✅ 所有数据库表和索引创建成功
2. ✅ 所有 API 端点可正常调用
3. ✅ 计数器（commentCount, shareCount）准确无误
4. ✅ Transaction 保证数据一致性
5. ✅ 用户可从中奖历史创建 winner showcase
6. ✅ 实物奖品的地址快照正确保存
7. ✅ 验证标识功能正常（Admin 可设置/取消）
8. ✅ Admin 可管理评论和查看统计
9. ✅ 通过所有测试用例
10. ✅ Swagger 文档完整
