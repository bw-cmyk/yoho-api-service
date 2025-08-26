# 多币种多子账户资产管理系统

这是一个完整的多币种多子账户资产管理系统，实现了游戏平台的核心资金管理功能。

## 🎯 核心特性

- ✅ **多币种支持**：支持USD、USDT、BTC、ETH等多种货币
- ✅ **多子账户**：真实余额、赠金余额、锁定余额分离管理
- ✅ **赠金策略**：智能赠金发放和消耗策略
- ✅ **事务安全**：所有资金操作都在数据库事务中执行
- ✅ **完整审计**：详细的交易流水记录
- ✅ **API接口**：完整的RESTful API支持

## 📊 数据模型

### 用户资产表 (`user_assets`)

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | BIGINT | 用户ID |
| `currency` | VARCHAR(10) | 币种 |
| `balance_real` | DECIMAL(18,8) | 真实余额（可提现） |
| `balance_bonus` | DECIMAL(18,8) | 赠金余额（仅可游戏） |
| `balance_locked` | DECIMAL(18,8) | 锁定余额（游戏进行中） |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

### 交易流水表 (`transactions`)

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | BIGINT | 主键ID |
| `transaction_id` | VARCHAR(64) | 交易ID（唯一） |
| `user_id` | BIGINT | 用户ID |
| `currency` | VARCHAR(10) | 币种 |
| `type` | ENUM | 交易类型 |
| `source` | ENUM | 资金来源 |
| `status` | ENUM | 交易状态 |
| `amount` | DECIMAL(18,8) | 交易金额 |
| `balance_before` | DECIMAL(18,8) | 交易前余额 |
| `balance_after` | DECIMAL(18,8) | 交易后余额 |
| `reference_id` | VARCHAR(255) | 关联业务ID |
| `description` | VARCHAR(255) | 交易描述 |
| `metadata` | JSON | 元数据 |
| `created_at` | TIMESTAMP | 创建时间 |

## 🔄 资金流转逻辑

### 1. 充值流程

```
用户充值 → 增加真实余额 → 根据规则发放赠金 → 记录交易流水
```

**示例**：
- 用户充值100 USDT
- 真实余额 +100 USDT
- 发放赠金 +10 USDT（10%比例）
- 记录两条交易流水

### 2. 下注流程

```
检查余额 → 优先扣赠金 → 不足部分扣真实余额 → 记录交易流水
```

**示例**：
- 用户下注60 USDT
- 赠金余额 -10 USDT
- 真实余额 -50 USDT
- 记录下注交易流水

### 3. 中奖流程

```
根据策略决定收益目标账户 → 增加对应余额 → 记录交易流水
```

**策略**：
- **保守策略**：收益优先进入赠金账户
- **激励策略**：收益直接进入真实账户

### 4. 提现流程

```
检查可提现余额 → 扣减真实余额 → 记录交易流水
```

**注意**：赠金余额永远不能提现

## 🚀 快速开始

### 1. 安装依赖

```bash
yarn add decimal.js
```

### 2. 导入模块

```typescript
// app.module.ts
import { AssetsModule } from './common-modules/assets/assets.module';

@Module({
  imports: [
    // ... 其他模块
    AssetsModule,
  ],
})
export class AppModule {}
```

### 3. 使用服务

```typescript
import { Injectable } from '@nestjs/common';
import { AssetService } from './common-modules/assets/services/asset.service';
import { Currency } from './common-modules/assets/entities/user-asset.entity';
import { Decimal } from 'decimal.js';

@Injectable()
export class YourService {
  constructor(private readonly assetService: AssetService) {}

  async handleDeposit(userId: number, amount: string) {
    const result = await this.assetService.deposit({
      user_id: userId,
      currency: Currency.USDT,
      amount: new Decimal(amount),
      description: '用户充值',
    });

    return result;
  }
}
```

## 📡 API接口

### 获取用户资产

```http
GET /assets/{userId}
GET /assets/{userId}/{currency}
```

### 资金操作

```http
POST /assets/deposit
POST /assets/bet
POST /assets/win
POST /assets/withdraw
POST /assets/lock
POST /assets/unlock
```

### 交易历史

```http
GET /assets/{userId}/transactions
GET /assets/transactions/types
```

## 💰 赠金策略配置

### 1. 充值赠金比例

```typescript
// 在 AssetService 中配置
private async calculateBonusAmount(depositAmount: Decimal): Promise<Decimal> {
  const bonusRatio = new Decimal('0.1'); // 10%
  return depositAmount.mul(bonusRatio).toDecimalPlaces(8);
}
```

### 2. 下注扣款策略

```typescript
// 优先使用赠金，不足部分扣真实余额
private calculateBetDeduction(asset: UserAsset, amount: Decimal) {
  let bonusAmount = new Decimal(0);
  let realAmount = new Decimal(0);

  if (asset.balance_bonus.gt(0)) {
    bonusAmount = Decimal.min(asset.balance_bonus, amount);
    realAmount = amount.minus(bonusAmount);
  } else {
    realAmount = amount;
  }

  return { realAmount, bonusAmount };
}
```

### 3. 中奖收益策略

```typescript
// 保守策略：优先进入赠金账户
private async determineWinTarget(asset: UserAsset): Promise<TransactionSource> {
  if (asset.balance_bonus.gt(0)) {
    return TransactionSource.BONUS;
  }
  return TransactionSource.REAL;
}
```

## 🔒 安全特性

### 1. 事务安全

所有资金操作都在数据库事务中执行，确保数据一致性：

```typescript
return await this.dataSource.transaction(async (manager) => {
  // 资金操作
  // 交易记录
  // 返回结果
});
```

### 2. 余额检查

每次操作前都会检查余额是否充足：

```typescript
if (!asset.hasEnoughBalance(amount)) {
  throw new BadRequestException('余额不足');
}
```

### 3. 赠金保护

赠金余额永远不能提现：

```typescript
if (!asset.hasEnoughWithdrawableBalance(amount)) {
  throw new BadRequestException('可提现余额不足');
}
```

## 📈 监控和审计

### 1. 交易流水

每笔资金变动都会记录详细的交易流水：

- 交易前余额
- 交易后余额
- 交易类型和来源
- 关联业务ID
- 操作员信息

### 2. 余额计算

提供多种余额计算方式：

```typescript
// 总可用余额
asset.totalBalance // = balance_real + balance_bonus

// 可提现余额
asset.withdrawableBalance // = balance_real

// 可用余额
asset.availableBalance // = totalBalance - balance_locked
```

### 3. 交易统计

支持按时间、类型、状态等维度统计交易数据。

## 🎮 游戏集成

### 1. 游戏下注

```typescript
const betResult = await this.assetService.bet({
  user_id: userId,
  currency: Currency.USDT,
  amount: new Decimal('100'),
  game_id: 'SLOT_001',
  description: '老虎机游戏下注',
});
```

### 2. 游戏中奖

```typescript
const winResult = await this.assetService.win({
  user_id: userId,
  currency: Currency.USDT,
  amount: new Decimal('200'),
  game_id: 'SLOT_001',
  description: '老虎机游戏中奖',
});
```

### 3. 余额锁定

```typescript
// 游戏开始时锁定余额
await this.assetService.lockBalance(userId, Currency.USDT, new Decimal('50'), 'GAME_001');

// 游戏结束时解锁余额
await this.assetService.unlockBalance(userId, Currency.USDT, new Decimal('50'), 'GAME_001');
```

## 🔧 配置选项

### 1. 币种配置

在 `Currency` 枚举中添加新的币种：

```typescript
export enum Currency {
  USD = 'USD',
  USDT = 'USDT',
  BTC = 'BTC',
  ETH = 'ETH',
  // 添加新币种
  BNB = 'BNB',
}
```

### 2. 交易类型配置

在 `TransactionType` 枚举中添加新的交易类型：

```typescript
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  BONUS_GRANT = 'BONUS_GRANT',
  GAME_BET = 'GAME_BET',
  GAME_WIN = 'GAME_WIN',
  // 添加新类型
  REFERRAL_BONUS = 'REFERRAL_BONUS',
}
```

## 🚨 注意事项

### 1. 精度处理

使用 `decimal.js` 处理所有金额计算，避免浮点数精度问题：

```typescript
import { Decimal } from 'decimal.js';

const amount = new Decimal('100.12345678');
```

### 2. 并发控制

对于高并发场景，建议使用分布式锁：

```typescript
// 使用Redis分布式锁
const lockKey = `asset_lock:${userId}:${currency}`;
const lockAcquired = await this.redisService.acquireLock(lockKey, 30);
```

### 3. 数据备份

定期备份用户资产和交易流水数据，确保数据安全。

## 📝 示例代码

查看 `assets.example.ts` 文件了解完整的使用示例，包括：

- 完整的资金流转流程
- 多币种资产管理
- 赠金策略演示
- 错误处理
- 批量操作

## 🤝 贡献

欢迎提交Issue和Pull Request来改进这个资产管理系统。 