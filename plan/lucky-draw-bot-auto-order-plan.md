# Lucky Draw Bot Auto Order Implementation Plan

## 1. Requirements Restatement

### Core Requirements
1. **Bot User Management**: 能够创建和管理指定数量的机器人用户，这些用户拥有预充值的余额用于自动下单
2. **User/Bot Differentiation**: 系统需要能够区分真实用户和机器人用户，但对外展示时保持一致的用户体验
3. **Configurable Order Rhythm**: 支持配置下单节奏，包括随机延迟、下单频率等参数

### Business Goals
- 让一元购活动看起来更活跃
- 机器人行为应该模拟真实用户，避免明显的规律性
- 机器人中奖的奖品可以回收到系统池中

### Architecture Decision
- **独立 Bot Module**: 不在 ecommerce module 中实现，而是创建独立的 `bot` module
- **子文件夹区分执行类型**: 使用子文件夹区分不同的 bot 执行逻辑（如 lucky-draw、future 其他类型）
- **共用调度器**: 调度任务层可以共用，便于后续扩展新的执行逻辑

---

## 2. Technical Analysis

### 2.1 Current System Structure

**User Entity** (`src/api-modules/user/entity/user.entity.ts`):
- 使用 Snowflake ID 作为主键
- 包含 `role` 字段 (INNER=1000, LP=100, HOLDER=10, HOLDER_READ_ONLY=5, INIT=1)
- 目前没有标识机器人用户的字段

**Draw Service** (`src/api-modules/ecommerce/services/draw.service.ts`):
- `purchaseSpots()` 方法处理购买抽奖号码
- 使用 `AssetService.bet()` 扣款
- 支持事务处理和悲观锁

**Asset Service** (`src/api-modules/assets/services/asset.service.ts`):
- `deposit()` 方法可以为用户充值
- `bet()` 方法用于下注/扣款
- 支持 USD 货币

### 2.2 Integration Points

1. **User Creation**: 需要扩展 UserService 来批量创建机器人用户
2. **Balance Management**: 使用现有的 AssetService.deposit() 为机器人充值
3. **Order Placement**: 复用 DrawService.purchaseSpots() 进行下单
4. **Scheduling**: 使用 NestJS 的 @Cron 或 Redis Queue 实现定时任务

---

## 3. Module Architecture

### 3.1 Bot Module Structure

```
src/api-modules/bot/
├── bot.module.ts                          # Bot 主模块
├── constants/
│   └── bot.constants.ts                   # 常量定义
├── enums/
│   └── bot.enums.ts                       # 枚举定义（BotType, TaskStatus 等）
│
├── core/                                  # 核心共用层
│   ├── entities/
│   │   ├── bot-user.entity.ts             # 机器人用户扩展信息
│   │   ├── bot-task.entity.ts             # 通用任务实体
│   │   └── bot-task-log.entity.ts         # 通用任务日志
│   ├── services/
│   │   ├── bot-user.service.ts            # 机器人用户管理
│   │   ├── bot-scheduler.service.ts       # 通用调度器
│   │   └── bot-name-generator.service.ts  # 名称/头像生成
│   └── interfaces/
│       └── bot-executor.interface.ts      # 执行器接口定义
│
├── executors/                             # 执行器层（按类型分子文件夹）
│   └── lucky-draw/                        # 一元购执行器
│       ├── lucky-draw.executor.ts         # 一元购下单执行逻辑
│       ├── lucky-draw.config.entity.ts    # 一元购专用配置实体
│       └── lucky-draw.log.entity.ts       # 一元购专用日志实体
│   └── [future-type]/                     # 未来其他类型...
│
└── controllers/
    └── bot-admin.controller.ts            # Admin API 控制器
```

### 3.2 Design Principles

1. **执行器模式**: 每种 bot 类型实现 `IBotExecutor` 接口
2. **配置驱动**: 每种类型有独立的配置实体，支持不同的参数
3. **共用调度**: `BotSchedulerService` 统一管理所有类型的任务调度
4. **可扩展性**: 新增 bot 类型只需在 `executors/` 下添加新的子文件夹

---

## 4. Implementation Plan

### Phase 1: Database Schema Updates

#### 1.1 Add Bot Flag to User Entity

**File**: `src/api-modules/user/entity/user.entity.ts`

```typescript
// 新增字段
@Column({
  name: 'is_bot',
  default: false,
})
isBot: boolean;

@Column({
  name: 'bot_config',
  type: 'jsonb',
  nullable: true,
})
botConfig: {
  displayName?: string;      // 展示名称
  displayAvatar?: string;    // 展示头像
  createdBy?: string;        // 创建者 admin ID
  createdAt?: Date;          // 创建时间
};
```

#### 1.2 Core Bot Entities

**New File**: `src/api-modules/bot/core/entities/bot-user.entity.ts`

```typescript
@Entity('yoho_bot_users')
export class BotUser {
  @PrimaryColumn()
  userId: string;  // 关联 User.id

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ name: 'display_avatar', nullable: true })
  displayAvatar: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy: string;  // Admin ID

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

**New File**: `src/api-modules/bot/core/entities/bot-task.entity.ts`

```typescript
@Entity('yoho_bot_tasks')
export class BotTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_type' })
  taskType: string;  // 'LUCKY_DRAW', 'FUTURE_TYPE', etc.

  @Column({ name: 'target_id' })
  targetId: string;  // productId for lucky draw, etc.

  @Column({ default: false })
  enabled: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  config: Record<string, any>;  // 类型特定的配置

  @Column({ name: 'last_executed_at', nullable: true })
  lastExecutedAt: Date;

  @Column({ name: 'next_execute_at', nullable: true })
  nextExecuteAt: Date;

  @Column({ name: 'executions_today', default: 0 })
  executionsToday: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

**New File**: `src/api-modules/bot/core/entities/bot-task-log.entity.ts`

```typescript
@Entity('yoho_bot_task_logs')
export class BotTaskLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id' })
  taskId: number;

  @Column({ name: 'task_type' })
  taskType: string;

  @Column({ name: 'bot_user_id' })
  botUserId: string;

  @Column({ default: 'SUCCESS' })
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any>;  // 执行详情

  @Column({ name: 'error_message', nullable: true })
  errorMessage: string;

  @Column({ name: 'execution_time_ms', nullable: true })
  executionTimeMs: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
```

#### 1.3 Lucky Draw Specific Entities

**New File**: `src/api-modules/bot/executors/lucky-draw/lucky-draw.config.entity.ts`

```typescript
@Entity('yoho_bot_lucky_draw_configs')
export class BotLuckyDrawConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'product_id', unique: true })
  productId: number;

  @Column({ default: true })
  enabled: boolean;

  // 下单节奏配置
  @Column({ name: 'min_interval_seconds', default: 30 })
  minIntervalSeconds: number;

  @Column({ name: 'max_interval_seconds', default: 300 })
  maxIntervalSeconds: number;

  @Column({ name: 'min_quantity', default: 1 })
  minQuantity: number;

  @Column({ name: 'max_quantity', default: 5 })
  maxQuantity: number;

  @Column({ name: 'daily_order_limit', default: 100 })
  dailyOrderLimit: number;

  @Column({ name: 'max_fill_percentage', default: 80 })
  maxFillPercentage: number;

  // 活跃时段 (0-23)
  @Column({ name: 'active_hours', type: 'jsonb', default: '[]' })
  activeHours: number[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

### Phase 2: Core Bot Services

#### 2.1 Bot Executor Interface

**New File**: `src/api-modules/bot/core/interfaces/bot-executor.interface.ts`

```typescript
export interface IBotExecutor {
  /**
   * 执行器类型标识
   */
  readonly type: string;

  /**
   * 执行一次任务
   */
  execute(task: BotTask, botUser: BotUser): Promise<BotTaskLog>;

  /**
   * 检查是否可以执行
   */
  canExecute(task: BotTask): Promise<boolean>;

  /**
   * 计算下次执行时间
   */
  calculateNextExecuteTime(task: BotTask): Date;

  /**
   * 获取可用的 Bot 用户
   */
  getAvailableBot(task: BotTask): Promise<BotUser | null>;
}
```

#### 2.2 Bot User Service

**New File**: `src/api-modules/bot/core/services/bot-user.service.ts`

```typescript
@Injectable()
export class BotUserService {
  // 批量创建机器人用户
  async createBotUsers(count: number, options: {
    displayNamePrefix?: string;
    initialBalance?: Decimal;
    createdBy?: string;
  }): Promise<BotUser[]>;

  // 获取所有机器人用户
  async getBotUsers(options?: {
    enabled?: boolean;
    hasBalance?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ items: BotUser[]; total: number }>;

  // 获取有余额的随机机器人
  async getRandomAvailableBot(minBalance?: Decimal): Promise<BotUser | null>;

  // 为机器人充值
  async rechargeBotUser(botUserId: string, amount: Decimal): Promise<void>;

  // 批量充值
  async batchRechargeBotUsers(amount: Decimal): Promise<{ success: number; failed: number }>;

  // 获取余额统计
  async getBotBalanceStats(): Promise<{
    totalBots: number;
    enabledBots: number;
    totalBalance: Decimal;
    avgBalance: Decimal;
    botsWithLowBalance: number;
  }>;

  // 切换状态
  async toggleBotStatus(botUserId: string, enabled: boolean): Promise<void>;

  // 删除（软删除）
  async deleteBotUser(botUserId: string): Promise<void>;
}
```

#### 2.3 Bot Scheduler Service

**New File**: `src/api-modules/bot/core/services/bot-scheduler.service.ts`

```typescript
@Injectable()
export class BotSchedulerService {
  private executors: Map<string, IBotExecutor> = new Map();

  // 注册执行器
  registerExecutor(executor: IBotExecutor): void;

  // 定时检查并执行任务
  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkAndExecuteTasks(): Promise<void>;

  // 执行单个任务
  private async executeTask(task: BotTask): Promise<void>;

  // 启动任务
  async startTask(taskId: number): Promise<void>;

  // 停止任务
  async stopTask(taskId: number): Promise<void>;

  // 获取任务状态
  async getTaskStatus(taskId: number): Promise<{
    running: boolean;
    lastExecutedAt: Date;
    nextExecuteAt: Date;
    executionsToday: number;
  }>;

  // 重置每日计数（每天零点）
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async resetDailyCounters(): Promise<void>;
}
```

#### 2.4 Bot Name Generator Service

**New File**: `src/api-modules/bot/core/services/bot-name-generator.service.ts`

```typescript
@Injectable()
export class BotNameGeneratorService {
  private readonly firstNames: string[] = [
    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Avery',
    'Quinn', 'Skyler', 'Dakota', 'Reese', 'Finley', 'Hayden', 'Emerson', ...
  ];

  private readonly lastNames: string[] = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', ...
  ];

  private readonly avatarBaseUrls: string[] = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=',
    'https://api.dicebear.com/7.x/bottts/svg?seed=',
    ...
  ];

  generateDisplayName(): string;
  generateAvatar(): string;
  generateBotIdentity(): { displayName: string; displayAvatar: string };
}
```

---

### Phase 3: Lucky Draw Executor

#### 3.1 Lucky Draw Executor

**New File**: `src/api-modules/bot/executors/lucky-draw/lucky-draw.executor.ts`

```typescript
@Injectable()
export class LuckyDrawExecutor implements IBotExecutor {
  readonly type = 'LUCKY_DRAW';

  constructor(
    private readonly drawService: DrawService,
    private readonly botUserService: BotUserService,
    private readonly configRepository: Repository<BotLuckyDrawConfig>,
  ) {}

  async execute(task: BotTask, botUser: BotUser): Promise<BotTaskLog> {
    const config = await this.getConfig(task.targetId);
    const productId = parseInt(task.targetId);

    // 计算随机下单数量
    const quantity = this.calculateQuantity(config);

    // 执行下单
    const result = await this.drawService.purchaseSpots(
      botUser.userId,
      productId,
      quantity,
    );

    return {
      taskId: task.id,
      taskType: this.type,
      botUserId: botUser.userId,
      status: 'SUCCESS',
      details: {
        productId,
        quantity,
        orderNumber: result.orderNumber,
        drawRoundId: result.drawRound.id,
      },
    };
  }

  async canExecute(task: BotTask): Promise<boolean> {
    const config = await this.getConfig(task.targetId);

    // 检查是否启用
    if (!config?.enabled) return false;

    // 检查活跃时段
    if (!this.isActiveHour(config)) return false;

    // 检查每日限额
    if (task.executionsToday >= config.dailyOrderLimit) return false;

    // 检查填充百分比
    const round = await this.drawService.getOngoingRoundDetail(parseInt(task.targetId));
    if (!round) return false;

    const fillPercentage = (round.soldSpots / round.totalSpots) * 100;
    if (fillPercentage >= config.maxFillPercentage) return false;

    return true;
  }

  calculateNextExecuteTime(task: BotTask): Date {
    const config = task.config as BotLuckyDrawConfig;
    const delay = this.randomBetween(
      config.minIntervalSeconds,
      config.maxIntervalSeconds,
    );
    return new Date(Date.now() + delay * 1000);
  }

  async getAvailableBot(task: BotTask): Promise<BotUser | null> {
    const config = await this.getConfig(task.targetId);
    const minBalance = new Decimal(config.maxQuantity).times(0.1); // 假设每个号码 0.1 USD
    return this.botUserService.getRandomAvailableBot(minBalance);
  }

  private calculateQuantity(config: BotLuckyDrawConfig): number {
    return this.randomBetween(config.minQuantity, config.maxQuantity);
  }

  private isActiveHour(config: BotLuckyDrawConfig): boolean {
    if (!config.activeHours?.length) return true;
    const currentHour = new Date().getHours();
    return config.activeHours.includes(currentHour);
  }

  private randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
```

---

### Phase 4: Admin API & DTOs

#### 4.1 Admin Controller

**New File**: `src/api-modules/bot/controllers/bot-admin.controller.ts`

```typescript
@Controller('admin/bot')
@UseGuards(AdminJwtGuard)
export class BotAdminController {
  // ========== Bot User Management ==========

  @Post('users/batch-create')
  async batchCreateBotUsers(@Body() dto: BatchCreateBotUsersDto);

  @Get('users')
  async getBotUsers(@Query() query: GetBotUsersQueryDto);

  @Post('users/:id/recharge')
  async rechargeBotUser(@Param('id') id: string, @Body() dto: RechargeDto);

  @Post('users/batch-recharge')
  async batchRechargeBotUsers(@Body() dto: BatchRechargeDto);

  @Get('users/stats')
  async getBotStats();

  @Patch('users/:id/toggle')
  async toggleBotStatus(@Param('id') id: string, @Body() dto: ToggleStatusDto);

  @Delete('users/:id')
  async deleteBotUser(@Param('id') id: string);

  // ========== Task Management ==========

  @Get('tasks')
  async getTasks(@Query() query: GetTasksQueryDto);

  @Post('tasks/:id/start')
  async startTask(@Param('id') id: number);

  @Post('tasks/:id/stop')
  async stopTask(@Param('id') id: number);

  @Get('tasks/:id/status')
  async getTaskStatus(@Param('id') id: number);

  // ========== Lucky Draw Specific ==========

  @Get('lucky-draw/configs')
  async getLuckyDrawConfigs();

  @Get('lucky-draw/configs/:productId')
  async getLuckyDrawConfig(@Param('productId') productId: number);

  @Put('lucky-draw/configs/:productId')
  async updateLuckyDrawConfig(
    @Param('productId') productId: number,
    @Body() dto: UpdateLuckyDrawConfigDto,
  );

  @Post('lucky-draw/configs/:productId/enable')
  async enableLuckyDrawBot(@Param('productId') productId: number);

  @Post('lucky-draw/configs/:productId/disable')
  async disableLuckyDrawBot(@Param('productId') productId: number);

  // ========== Logs ==========

  @Get('logs')
  async getTaskLogs(@Query() query: GetTaskLogsQueryDto);
}
```

#### 4.2 DTOs

**New File**: `src/api-modules/bot/dto/bot-admin.dto.ts`

```typescript
// Bot User DTOs
export class BatchCreateBotUsersDto {
  @IsNumber()
  @Min(1)
  @Max(100)
  count: number;

  @IsOptional()
  @IsString()
  displayNamePrefix?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  initialBalance?: number;
}

export class RechargeDto {
  @IsNumber()
  @Min(0.01)
  amount: number;
}

export class BatchRechargeDto {
  @IsNumber()
  @Min(0.01)
  amountPerBot: number;
}

// Lucky Draw Config DTOs
export class UpdateLuckyDrawConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(10)
  minIntervalSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  maxIntervalSeconds?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  minQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  dailyOrderLimit?: number;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(95)
  maxFillPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(0)
  @ArrayMaxSize(24)
  activeHours?: number[];
}

// Query DTOs
export class GetBotUsersQueryDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  hasBalance?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}

export class GetTaskLogsQueryDto {
  @IsOptional()
  @IsString()
  taskType?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  taskId?: number;

  @IsOptional()
  @IsString()
  status?: 'SUCCESS' | 'FAILED' | 'SKIPPED';

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 50;
}
```

---

### Phase 5: Frontend Admin Panel

#### 5.1 Bot Management Page

**New File**: `admin-browser/src/pages/bot/BotUserManagement.tsx`

功能：
- 显示机器人用户列表（名称、头像、余额、状态）
- 批量创建机器人用户
- 批量/单独充值
- 启用/禁用机器人
- 查看余额统计仪表盘

#### 5.2 Lucky Draw Bot Config Page

**New File**: `admin-browser/src/pages/bot/LuckyDrawBotConfig.tsx`

功能：
- 按产品显示配置列表
- 配置下单节奏参数
- 启动/停止自动下单
- 查看执行状态和统计

#### 5.3 Bot Task Logs Page

**New File**: `admin-browser/src/pages/bot/BotTaskLogs.tsx`

功能：
- 查看任务执行日志
- 按类型、状态筛选
- 查看执行详情

---

## 5. File Structure Summary

```
src/api-modules/bot/
├── bot.module.ts                                    # [NEW] Bot 主模块
├── constants/
│   └── bot.constants.ts                             # [NEW] 常量定义
├── enums/
│   └── bot.enums.ts                                 # [NEW] 枚举定义
│
├── core/                                            # 核心共用层
│   ├── entities/
│   │   ├── bot-user.entity.ts                       # [NEW] 机器人用户扩展
│   │   ├── bot-task.entity.ts                       # [NEW] 通用任务
│   │   └── bot-task-log.entity.ts                   # [NEW] 通用日志
│   ├── services/
│   │   ├── bot-user.service.ts                      # [NEW] 用户管理
│   │   ├── bot-scheduler.service.ts                 # [NEW] 调度器
│   │   └── bot-name-generator.service.ts            # [NEW] 名称生成
│   └── interfaces/
│       └── bot-executor.interface.ts                # [NEW] 执行器接口
│
├── executors/                                       # 执行器层
│   └── lucky-draw/
│       ├── lucky-draw.executor.ts                   # [NEW] 一元购执行器
│       └── lucky-draw.config.entity.ts              # [NEW] 一元购配置
│
├── controllers/
│   └── bot-admin.controller.ts                      # [NEW] Admin API
│
└── dto/
    └── bot-admin.dto.ts                             # [NEW] DTOs

src/api-modules/user/
└── entity/
    └── user.entity.ts                               # [MODIFY] 添加 isBot 字段

admin-browser/src/
├── pages/bot/
│   ├── BotUserManagement.tsx                        # [NEW] 机器人管理
│   ├── LuckyDrawBotConfig.tsx                       # [NEW] 一元购配置
│   └── BotTaskLogs.tsx                              # [NEW] 任务日志
└── api/
    └── bot.ts                                       # [NEW] API 封装
```

---

## 6. Risk Assessment

### High Risk
- **数据一致性**: 机器人下单需要正确处理并发和事务，避免超卖或余额错误
  - **Mitigation**: 复用现有的 `purchaseSpots()` 方法，已有悲观锁机制

### Medium Risk
- **机器人行为被识别**: 如果下单模式太规律，可能被用户发现
  - **Mitigation**:
    - 使用随机延迟（min/max interval）
    - 随机下单数量
    - 配置活跃时段
    - 设置最大填充百分比，保留空间给真实用户

- **余额管理**: 机器人余额不足时需要及时预警
  - **Mitigation**:
    - Admin 面板显示余额统计
    - 可设置余额预警阈值

### Low Risk
- **性能影响**: 机器人下单增加系统负载
  - **Mitigation**: 通过配置控制下单频率，避免过于频繁

---

## 7. Complexity Assessment

| Phase | Complexity | Description |
|-------|------------|-------------|
| Phase 1: Database Schema | Low | 添加 User.isBot 字段，创建 core 和 executor 实体 |
| Phase 2: Core Bot Services | Medium | BotUserService, BotSchedulerService, NameGenerator |
| Phase 3: Lucky Draw Executor | Medium | 实现 IBotExecutor 接口，复用 DrawService |
| Phase 4: Admin API | Medium | Controller 和 DTOs |
| Phase 5: Frontend Admin | Medium | React 页面（用户管理、配置、日志） |

---

## 8. Implementation Order

1. **Phase 1**: Database schema updates (必须先完成)
   - User entity 添加 isBot 字段
   - 创建 core entities (BotUser, BotTask, BotTaskLog)
   - 创建 lucky-draw config entity

2. **Phase 2**: Core services
   - BotUserService (用户管理)
   - BotNameGeneratorService (名称生成)
   - BotSchedulerService (调度器)

3. **Phase 3**: Lucky Draw Executor
   - 实现 LuckyDrawExecutor
   - 注册到调度器

4. **Phase 4**: Admin API
   - BotAdminController
   - DTOs

5. **Phase 5**: Frontend Admin Panel

建议按此顺序实现，每个阶段完成后进行测试验证。

---

## 9. Testing Checklist

### Bot User Management
- [ ] 批量创建机器人用户
- [ ] 机器人用户名/头像随机生成
- [ ] 单独/批量充值
- [ ] 启用/禁用机器人
- [ ] 余额统计正确

### Scheduler & Executor
- [ ] 任务按配置间隔执行
- [ ] 随机延迟生效
- [ ] 随机数量生效
- [ ] 活跃时段限制生效
- [ ] 填充百分比限制生效
- [ ] 每日限额生效
- [ ] 任务启动/停止正常
- [ ] 每日计数重置

### Integration
- [ ] 复用 DrawService.purchaseSpots() 正常
- [ ] 并发下单无数据问题
- [ ] 机器人用户对外显示正常（不暴露 isBot）
- [ ] 日志记录完整

### Edge Cases
- [ ] 无可用机器人（余额不足）时跳过
- [ ] 期次已满时正确处理
- [ ] 期次切换时正确处理
- [ ] 配置动态更新生效

---

## 10. Future Extensions

基于当前的模块化架构，未来可以轻松扩展：

```
src/api-modules/bot/executors/
├── lucky-draw/              # 一元购 bot
├── btc-prediction/          # BTC 预测游戏 bot（未来）
├── social-engagement/       # 社交互动 bot（未来）
└── [new-type]/              # 其他新类型
```

每种新类型只需：
1. 在 `executors/` 下创建新的子文件夹
2. 实现 `IBotExecutor` 接口
3. 注册到 `BotSchedulerService`
4. 添加对应的 Admin API 和前端页面
