# 一元购保底中奖功能设计方案

## 1. 需求说明

每个用户在**全局**范围内（跨所有一元购商品）第 N 次参与一元购时，**保证当期中奖**。N 为全局可配置项，默认为 1（即所有用户第一次参与必中）。第 N 次之后恢复正常概率开奖。

**核心设计原则：**
- 保底中奖发生在**私有轮次**中，与公开轮次完全隔离，不影响其他用户的公平性
- 私有轮次只有触发保底的用户本人可见（其他人看不到该轮次）
- 公开轮次的开奖逻辑、可见性、参与流程**完全不变**
- 维持现有订单、晒单逻辑不变

---

## 2. 全局配置

通过 Admin 后台维护，运行时可热更新：

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `draw.guaranteedWinEnabled` | `boolean` | `true` | 是否开启全局保底中奖 |
| `draw.guaranteedWinOnNthParticipation` | `number` | `1` | 第几次全局参与触发保底 |

---

## 3. 核心设计：私有轮次（Private Round）

### 3.1 触发时机

用户在 `purchaseSpots()` 时，若全局参与次数（含本次）恰好等于配置的 N，则：
1. **照常在当前公开轮次完成购买**（扣款、分配号码、创建参与记录，一切正常）
2. **额外创建一个私有轮次**，仅属于该用户，并立即完成开奖，保证该用户中奖

### 3.2 私有轮次特性

| 属性 | 值 | 说明 |
|------|-----|------|
| `isPrivate` | `true` | 私有标记 |
| `privateUserId` | 触发用户 ID | 仅该用户可见 |
| `totalSpots` | `quantity`（本次购买数量） | 由用户的购买量填满，立即满员 |
| `soldSpots` | `quantity` | 创建即满员 |
| `status` | `DRAWN` | 创建时直接走完开奖流程 |
| `pricePerSpot` | 同商品公开轮次价格 | 用户正常付费 |
| `roundNumber` | 独立编号（如负数或特殊前缀） | 与公开轮次编号隔离 |
| `autoCreateNext` | `false` | 私有轮次不自动创建下一期 |

### 3.3 私有轮次开奖

私有轮次创建后立即调用 `processDraw()`，但走简化分支：
- 跳过区块链哈希计算
- 直接将用户的 `startNumber` 作为中奖号码
- 创建 `DrawResult`，`isGuaranteedWin = true`
- 正常执行 `distributePrize()`（奖品发放逻辑不变）

---

## 4. 数据模型变更

### 4.1 `DrawRound` 实体 — 新增私有轮次字段

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isPrivate` | `boolean` | `false` | 是否为私有轮次 |
| `privateUserId` | `string` | `null` | 私有轮次归属用户（仅该用户可见） |

### 4.2 `DrawParticipation` 实体 — 新增字段

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isGuaranteedWin` | `boolean` | `false` | 是否为保底中奖参与 |
| `userGlobalParticipationCount` | `number` | `null` | 用户全局第几次参与（快照） |

### 4.3 `DrawResult` 实体 — 新增标记

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `isGuaranteedWin` | `boolean` | `false` | 是否为保底中奖（供前端展示区分文案） |

---

## 5. 核心流程变更

### 5.1 购买流程 `purchaseSpots()`

```
现有逻辑（完全不变）：
  在公开轮次中正常购买 → 创建参与记录 → 扣款 → 若满员则触发公开轮次开奖

新增逻辑（在现有流程完成后追加）：
  1. 读取全局配置 guaranteedWinEnabled、guaranteedWinOnNthParticipation
  2. 若 guaranteedWinEnabled == false，结束

  3. 统计用户全局参与总次数（含本次）：
     SELECT COUNT(*) FROM draw_participation WHERE userId = ?
     → globalCount

  4. 记录 participation.userGlobalParticipationCount = globalCount

  5. 若 globalCount == guaranteedWinOnNthParticipation：
     a. 创建私有轮次（isPrivate=true, privateUserId=userId, totalSpots=quantity）
     b. 在私有轮次中创建参与记录（isGuaranteedWin=true）
     c. 从用户余额扣款（同公开轮次价格）
     d. 立即调用 processGuaranteedDraw(privateRound, participation)
```

> **注意**：用户在公开轮次中的购买和私有轮次中的购买**分别扣费**，用户为两次参与各付一次钱（公开轮次的号码依然有机会再赢一次）。
> 若业务决策为保底只收一次费用，则私有轮次免费，仅公开轮次扣款，在创建私有参与记录时 `totalAmount = 0`。

### 5.2 保底开奖 `processGuaranteedDraw()`

```
1. winningNumber = participation.startNumber
2. 创建 DrawResult：
   - drawRoundId = privateRound.id
   - winningNumber = winningNumber
   - winnerUserId = userId
   - isGuaranteedWin = true
   - blockHeight/blockHash 等字段留空
3. 更新私有轮次 status = DRAWN
4. 调用 distributePrize(drawResult, privateRound)  ← 发奖逻辑完全复用
```

### 5.3 公开轮次开奖 `processDraw()`

**无任何修改**，区块链哈希开奖逻辑保持原样。

---

## 6. API 可见性规则

| 接口 | 现有行为 | 变更 |
|------|----------|------|
| `GET /draws/rounds` (公开轮次列表) | 返回所有轮次 | 过滤掉 `isPrivate = true` 的轮次 |
| `GET /draws/rounds/ongoing` | 返回进行中轮次 | 过滤掉私有轮次 |
| `GET /draws/rounds/:id` | 返回轮次详情 | 若为私有轮次，校验 `privateUserId == currentUserId`，否则返回 404 |
| `GET /draws/rounds/:id/participations` | 返回期次参与记录 | 同上 |
| `GET /draws/participations/me` | 返回我的参与记录 | **不变**（私有轮次参与记录正常展示给本人） |
| `GET /draws/my-wins` | 返回中奖历史 | **不变**（私有轮次中奖结果正常展示给本人） |
| `GET /draws/recent-winners` (跑马灯) | 返回最近中奖 | 过滤掉 `isGuaranteedWin = true` 的结果，或由运营配置是否展示 |

---

## 7. 后续链路（无需修改）

| 链路 | 是否修改 | 说明 |
|------|----------|------|
| 订单创建（实物奖品领取 `claimPhysicalPrize`） | **不变** | DrawResult 结构一致，复用 |
| 现金/加密货币发放（`distributePrize`） | **不变** | 完全复用 |
| 晒单（`createFromDrawResult`） | **不变** | 以 drawResultId 关联，不关心轮次类型 |
| 中奖历史（`getMyWinningHistory`） | **不变** | 返回包含私有轮次中奖记录 |

---

## 8. Admin 配置

### 8.1 后端 API

```
GET  /api/v1/admin/ecommerce/draw/guaranteed-win-config
PATCH /api/v1/admin/ecommerce/draw/guaranteed-win-config
Body: { "enabled": true, "onNthParticipation": 1 }
```

### 8.2 前端 UI（admin-browser）

在一元购全局设置页新增「保底中奖设置」：
- Toggle：启用 / 禁用
- 数字输入：第 N 次全局参与触发（正整数，最小值 1）

---

## 9. 风险与处理策略

| 风险 | 等级 | 处理方式 |
|------|------|---------|
| 私有轮次中奖出现在公开跑马灯，暴露保底机制 | 中 | 跑马灯查询过滤 `isGuaranteedWin = true` 的结果 |
| 用户重复参与（第 N 次恰好在高并发下被重复计算） | 中 | 以数据库写入后 COUNT 为准，或加 Redis 分布式锁 per userId |
| 保底双扣费（公开轮次 + 私有轮次各扣一次） | 低 | 明确业务决策：若保底免费，私有轮次 `totalAmount = 0` |
| 历史数据迁移 | 低 | 新字段均有默认值（false/null），存量数据不受影响 |

---

## 10. 文件变更清单

| 文件 | 变更类型 | 说明 |
|------|----------|------|
| `src/api-modules/ecommerce/entities/draw-round.entity.ts` | 修改 | 新增 `isPrivate`、`privateUserId` |
| `src/api-modules/ecommerce/entities/draw-participation.entity.ts` | 修改 | 新增 `isGuaranteedWin`、`userGlobalParticipationCount` |
| `src/api-modules/ecommerce/entities/draw-result.entity.ts` | 修改 | 新增 `isGuaranteedWin` |
| `src/api-modules/ecommerce/services/draw.service.ts` | 修改 | `purchaseSpots()` 追加保底检测与私有轮次创建，新增 `processGuaranteedDraw()` |
| `src/api-modules/ecommerce/controllers/draw.controller.ts` | 修改 | 轮次查询接口过滤私有轮次，详情接口加私有校验 |
| `src/api-modules/admin/` | 新增 | 保底配置 API |
| `admin-browser/src/` | 新增 | 全局保底配置 UI |

---

## 11. 复杂度评估

**整体复杂度：LOW-MEDIUM**

- `draw.service.ts` 新增约 50~80 行逻辑（`processGuaranteedDraw` + `purchaseSpots` 追加）
- Controller 层过滤逻辑简单
- 订单 / 晒单 / 奖品发放链路**零修改**
- 公开轮次开奖逻辑**零修改**
