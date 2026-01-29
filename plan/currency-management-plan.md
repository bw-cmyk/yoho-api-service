# 货币管理功能实现计划

## 方案确认

**采用方案A (混合方案)**:
- ✅ **货币汇率**: 使用专门的 `CurrencyRate` 表存储
  - 优势: 查询性能好、数据类型明确(Decimal)、易于维护
  - 表结构: currency (PK), rateToUSD, symbol, name, decimals, isActive, displayOrder等

- ✅ **用户偏好**: 使用通用的 `UserSetting` 表存储
  - 优势: 可扩展支持多种用户偏好(货币、语言、主题等)
  - 表结构: (userId, settingKey) 复合主键, settingValue
  - 货币偏好: settingKey='currency', settingValue='AED'|'USD'|'INR'

**不使用的方案**:
- ❌ 系统配置表 (SystemConfig) - 对汇率管理来说太通用,查询效率低
- ❌ 单独的货币偏好表 (UserCurrencyPreference) - 不够灵活,无法支持其他偏好

---

## 一、需求重述

### 核心需求
1. **用户货币偏好**: 用户可以保存自己的货币偏好(USD/AED/INR)
2. **汇率管理**: 系统提供这些货币对USD的汇率,管理员可以在后台填写和更新
3. **前端展示转换**: 所有金额内部以USD计价存储,前端展示时根据用户偏好和汇率转换显示

### 设计原则
- **存储统一**: 继续使用USD作为内部存储货币,不改变现有资产系统
- **转换在边界**: 仅在API响应时进行货币转换,保持业务逻辑不变
- **管理员控制**: 汇率由管理员在后台配置,支持实时更新
- **用户友好**: 用户可以随时切换货币偏好,影响所有金额展示

---

## 二、技术架构设计

### 2.1 数据模型设计

#### A. 货币汇率表 (CurrencyRate) - 专门存储汇率
```typescript
@Entity('yoho_currency_rates')
export class CurrencyRate {
  @PrimaryColumn()
  currency: string; // 'USD', 'AED', 'INR' - 货币代码

  @Column('decimal', { precision: 18, scale: 8 })
  rateToUSD: Decimal; // 相对于USD的汇率

  @Column()
  symbol: string; // '$', 'د.إ', '₹' - 货币符号

  @Column()
  name: string; // 'US Dollar', 'UAE Dirham', 'Indian Rupee' - 货币名称

  @Column({ default: 2 })
  decimals: number; // 小数位数,默认2位

  @Column({ default: true })
  isActive: boolean; // 是否启用

  @Column({ default: 0 })
  displayOrder: number; // 前端展示顺序

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastUpdatedAt: Date; // 最后更新时间

  @Column({ nullable: true })
  updatedBy: string; // 更新人(admin userId)

  @CreateDateColumn()
  createdAt: Date; // 创建时间
}
```

**优势**:
- ✅ 查询性能优秀 (有索引和主键)
- ✅ 数据类型明确 (Decimal类型确保精度)
- ✅ 易于扩展 (可添加汇率历史、来源等字段)
- ✅ 数据完整性约束 (非空、唯一性等)

#### B. 用户设置表 (UserSetting) - 通用用户偏好
```typescript
@Entity('yoho_user_settings')
export class UserSetting {
  @PrimaryColumn()
  userId: string;

  @PrimaryColumn()
  settingKey: string; // 设置键,如 'currency', 'language', 'theme'

  @Column('text')
  settingValue: string; // 设置值,如 'AED', 'en', 'dark'

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // 复合主键: (userId, settingKey)
  // 例如:
  // ('user123', 'currency') => 'AED'
  // ('user123', 'language') => 'en'
  // ('user123', 'theme') => 'dark'
}
```

**货币偏好设置**:
```typescript
// 用户货币偏好
settingKey: 'currency'
settingValue: 'AED' | 'USD' | 'INR'
```

#### C. 扩展Currency枚举
```typescript
// src/api-modules/assets/entities/balance/user-asset.entity.ts
export enum Currency {
  USD = 'USD',
  AED = 'AED',
  INR = 'INR',
}
```

### 2.2 服务层设计

#### A. CurrencyService (新建) - 货币汇率管理服务
```typescript
@Injectable()
export class CurrencyService {
  constructor(
    @InjectRepository(CurrencyRate)
    private currencyRateRepository: Repository<CurrencyRate>,
    private redisService: RedisService, // 用于缓存
  ) {}

  // 获取所有启用的货币
  async getActiveCurrencies(): Promise<CurrencyRate[]> {
    const cacheKey = 'currency:active:all';
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const currencies = await this.currencyRateRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });

    await this.redisService.set(cacheKey, JSON.stringify(currencies), 3600); // 1小时TTL
    return currencies;
  }

  // 获取所有货币(包括未启用)
  async getAllCurrencies(): Promise<CurrencyRate[]> {
    return this.currencyRateRepository.find({
      order: { displayOrder: 'ASC' },
    });
  }

  // 获取单个货币
  async getCurrency(code: string): Promise<CurrencyRate> {
    const cacheKey = `currency:${code.toUpperCase()}`;
    const cached = await this.redisService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const currency = await this.currencyRateRepository.findOne({
      where: { currency: code.toUpperCase() },
    });

    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found`);
    }

    await this.redisService.set(cacheKey, JSON.stringify(currency), 3600);
    return currency;
  }

  // 获取汇率
  async getRate(currency: string): Promise<Decimal> {
    if (currency === 'USD') return new Decimal(1);
    const currencyData = await this.getCurrency(currency);
    return new Decimal(currencyData.rateToUSD);
  }

  // USD转换为目标货币
  async convertFromUSD(amountUSD: Decimal, targetCurrency: string): Promise<Decimal> {
    if (targetCurrency === 'USD') return amountUSD;
    const rate = await this.getRate(targetCurrency);
    return amountUSD.times(rate);
  }

  // 目标货币转换为USD
  async convertToUSD(amount: Decimal, fromCurrency: string): Promise<Decimal> {
    if (fromCurrency === 'USD') return amount;
    const rate = await this.getRate(fromCurrency);
    return amount.div(rate);
  }

  // 创建货币
  async createCurrency(data: Partial<CurrencyRate>, createdBy?: string): Promise<CurrencyRate> {
    const existing = await this.currencyRateRepository.findOne({
      where: { currency: data.currency.toUpperCase() },
    });

    if (existing) {
      throw new ConflictException(`Currency ${data.currency} already exists`);
    }

    const currency = this.currencyRateRepository.create({
      ...data,
      currency: data.currency.toUpperCase(),
      updatedBy: createdBy,
    });

    const saved = await this.currencyRateRepository.save(currency);
    await this.clearCache();
    return saved;
  }

  // 更新货币
  async updateCurrency(code: string, data: Partial<CurrencyRate>, updatedBy?: string): Promise<CurrencyRate> {
    const currency = await this.getCurrency(code);

    Object.assign(currency, {
      ...data,
      updatedBy,
      lastUpdatedAt: new Date(),
    });

    const updated = await this.currencyRateRepository.save(currency);
    await this.clearCache(code);
    return updated;
  }

  // 切换货币状态
  async toggleCurrencyStatus(code: string, updatedBy?: string): Promise<CurrencyRate> {
    if (code.toUpperCase() === 'USD') {
      throw new BadRequestException('Cannot disable USD');
    }

    const currency = await this.getCurrency(code);
    currency.isActive = !currency.isActive;
    currency.updatedBy = updatedBy;
    currency.lastUpdatedAt = new Date();

    const updated = await this.currencyRateRepository.save(currency);
    await this.clearCache(code);
    return updated;
  }

  // 删除货币
  async deleteCurrency(code: string): Promise<void> {
    if (code.toUpperCase() === 'USD') {
      throw new BadRequestException('Cannot delete USD');
    }

    await this.currencyRateRepository.delete({ currency: code.toUpperCase() });
    await this.clearCache(code);
  }

  // 清除缓存
  private async clearCache(code?: string): Promise<void> {
    if (code) {
      await this.redisService.del(`currency:${code.toUpperCase()}`);
    }
    await this.redisService.del('currency:active:all');
  }
}
```

#### B. UserSettingService (新建) - 通用用户设置服务
```typescript
@Injectable()
export class UserSettingService {
  // 获取用户设置
  async get(userId: string, key: string, defaultValue?: string): Promise<string>

  // 设置用户设置
  async set(userId: string, key: string, value: string): Promise<void>

  // 批量获取用户设置
  async getMultiple(userId: string, keys: string[]): Promise<Map<string, string>>

  // 批量获取多用户的某个设置
  async getBatch(userIds: string[], key: string): Promise<Map<string, string>>

  // 删除用户设置
  async delete(userId: string, key: string): Promise<void>
}
```

#### D. UserPreferenceService (新建) - 基于设置系统
```typescript
@Injectable()
export class UserPreferenceService {
  constructor(private settingService: UserSettingService) {}

  // 获取用户货币偏好
  async getUserCurrency(userId: string): Promise<string> {
    return this.settingService.get(userId, 'currency', 'USD');
  }

  // 设置用户货币偏好
  async setUserCurrency(userId: string, currency: string): Promise<void> {
    await this.settingService.set(userId, 'currency', currency);
  }

  // 批量获取用户货币偏好
  async getUserCurrencies(userIds: string[]): Promise<Map<string, string>> {
    return this.settingService.getBatch(userIds, 'currency');
  }
}
```

#### C. ResponseTransformerInterceptor (新建)
```typescript
@Injectable()
export class ResponseTransformerInterceptor implements NestInterceptor {
  constructor(
    private currencyService: CurrencyService,
    private preferenceService: UserPreferenceService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;

    return next.handle().pipe(
      map(async (data) => {
        if (!userId) return data;

        const preferredCurrency = await this.preferenceService.getUserCurrency(userId);
        if (preferredCurrency === 'USD') return data;

        return this.transformAmounts(data, preferredCurrency);
      }),
    );
  }

  // 递归转换响应中的金额字段
  private async transformAmounts(data: any, currency: string): Promise<any>
}
```

### 2.3 Admin API设计

#### A. Admin Currency Controller
```typescript
@Controller('api/v1/admin/currencies')
@UseGuards(AdminJwtGuard)
export class AdminCurrencyController {
  constructor(private currencyService: CurrencyService) {}

  // GET /api/v1/admin/currencies - 获取所有货币(包括未启用)
  @Get()
  async getAllCurrencies(): Promise<CurrencyRate[]> {
    return this.currencyService.getAllCurrencies();
  }

  // GET /api/v1/admin/currencies/:code - 获取单个货币
  @Get(':code')
  async getCurrency(@Param('code') code: string): Promise<CurrencyRate> {
    return this.currencyService.getCurrency(code);
  }

  // POST /api/v1/admin/currencies - 添加新货币
  @Post()
  async createCurrency(@Body() dto: CreateCurrencyDto, @CurrentUser() admin: User): Promise<CurrencyRate> {
    return this.currencyService.createCurrency(
      {
        currency: dto.code.toUpperCase(),
        rateToUSD: new Decimal(dto.rateToUSD),
        symbol: dto.symbol,
        name: dto.name,
        decimals: dto.decimals || 2,
        displayOrder: dto.displayOrder,
        isActive: true,
      },
      admin.id,
    );
  }

  // PUT /api/v1/admin/currencies/:code - 更新货币(汇率、名称等)
  @Put(':code')
  async updateCurrency(
    @Param('code') code: string,
    @Body() dto: UpdateCurrencyDto,
    @CurrentUser() admin: User,
  ): Promise<CurrencyRate> {
    const updateData: Partial<CurrencyRate> = {};

    if (dto.rateToUSD !== undefined) {
      updateData.rateToUSD = new Decimal(dto.rateToUSD);
    }
    if (dto.symbol !== undefined) updateData.symbol = dto.symbol;
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.decimals !== undefined) updateData.decimals = dto.decimals;
    if (dto.displayOrder !== undefined) updateData.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.currencyService.updateCurrency(code, updateData, admin.id);
  }

  // PATCH /api/v1/admin/currencies/:code/status - 启用/禁用货币
  @Patch(':code/status')
  async toggleStatus(@Param('code') code: string, @CurrentUser() admin: User): Promise<CurrencyRate> {
    return this.currencyService.toggleCurrencyStatus(code, admin.id);
  }

  // DELETE /api/v1/admin/currencies/:code - 删除货币
  @Delete(':code')
  @HttpCode(204)
  async deleteCurrency(@Param('code') code: string): Promise<void> {
    await this.currencyService.deleteCurrency(code);
  }
}
```

#### DTOs
```typescript
// src/api-modules/admin/dto/currency.dto.ts

export class CreateCurrencyDto {
  @IsString()
  @Length(3, 3)
  @Transform(({ value }) => value.toUpperCase())
  code: string; // 'AED'

  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/)
  rateToUSD: string; // '3.67'

  @IsString()
  @MaxLength(10)
  symbol: string; // 'د.إ'

  @IsString()
  @MaxLength(100)
  name: string; // 'UAE Dirham'

  @IsNumber()
  @Min(0)
  @Max(8)
  @IsOptional()
  decimals?: number; // 默认2

  @IsNumber()
  @Min(0)
  displayOrder: number;
}

export class UpdateCurrencyDto {
  @IsString()
  @Matches(/^\d+(\.\d{1,8})?$/)
  @IsOptional()
  rateToUSD?: string;

  @IsString()
  @MaxLength(10)
  @IsOptional()
  symbol?: string;

  @IsString()
  @MaxLength(100)
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @Max(8)
  @IsOptional()
  decimals?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  displayOrder?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CurrencyResponseDto {
  currency: string;
  rateToUSD: string;
  symbol: string;
  name: string;
  decimals: number;
  isActive: boolean;
  displayOrder: number;
  lastUpdatedAt: Date;
  updatedBy: string;
  createdAt: Date;
}
```

### 2.4 User API设计

#### A. User Settings Controller (通用用户设置)
```typescript
@Controller('api/v1/user/settings')
@UseGuards(JwtAuthGuard)
export class UserSettingsController {
  // GET /api/v1/user/settings/:key - 获取单个设置
  @Get(':key')
  async getSetting(@CurrentUser() user: User, @Param('key') key: string): Promise<{ key: string; value: string }>

  // PUT /api/v1/user/settings/:key - 设置单个设置
  @Put(':key')
  async setSetting(
    @CurrentUser() user: User,
    @Param('key') key: string,
    @Body() dto: SetSettingDto
  ): Promise<void>

  // GET /api/v1/user/settings - 获取所有设置
  @Get()
  async getAllSettings(@CurrentUser() user: User): Promise<Record<string, string>>
}
```

#### B. User Preference Controller (货币偏好,基于设置系统)
```typescript
@Controller('api/v1/user/preferences')
@UseGuards(JwtAuthGuard)
export class UserPreferenceController {
  // GET /api/v1/user/preferences/currency - 获取用户货币偏好
  @Get('currency')
  async getCurrencyPreference(@CurrentUser() user: User): Promise<{ currency: string }> {
    const currency = await this.preferenceService.getUserCurrency(user.id);
    return { currency };
  }

  // PUT /api/v1/user/preferences/currency - 设置货币偏好
  @Put('currency')
  async setCurrencyPreference(
    @CurrentUser() user: User,
    @Body() dto: SetCurrencyDto,
  ): Promise<void> {
    // 验证货币是否启用
    const meta = await this.currencyService.getCurrencyMetadata(dto.currency);
    if (!meta.isActive) {
      throw new BadRequestException('Currency is not active');
    }

    await this.preferenceService.setUserCurrency(user.id, dto.currency);
  }

  // GET /api/v1/user/preferences/currencies/available - 获取可用货币列表
  @Get('currencies/available')
  async getAvailableCurrencies(): Promise<CurrencyMetadata[]> {
    return this.currencyService.getActiveCurrencies();
  }
}
```

#### DTOs
```typescript
// 通用设置DTO
export class SetSettingDto {
  @IsString()
  value: string;
}

// 货币偏好DTO
export class SetCurrencyDto {
  @IsEnum(Currency)
  currency: string; // 'USD' | 'AED' | 'INR'
}

export class CurrencyPreferenceResponseDto {
  currency: string;
}
```

---

## 三、实现阶段划分

### Phase 1: 数据库层 (1-2小时)
**目标**: 建立货币汇率和用户设置的数据基础

**步骤**:
1. 创建 `CurrencyRate` entity
   - 文件: `src/common-modules/currency/entities/currency-rate.entity.ts`
   - 字段: currency (PK), rateToUSD, symbol, name, decimals, isActive, displayOrder, lastUpdatedAt, updatedBy, createdAt
   - 索引: currency (主键), displayOrder

2. 创建 `UserSetting` entity
   - 文件: `src/api-modules/user/entities/user-setting.entity.ts`
   - 字段: userId (PK), settingKey (PK), settingValue, updatedAt, createdAt
   - 复合主键: (userId, settingKey)
   - 外键: userId → User.id ON DELETE CASCADE
   - 索引: (userId, settingKey)

3. 创建 `CurrencyModule`
   - 文件: `src/common-modules/currency/currency.module.ts`
   - 注册: CurrencyRate entity, CurrencyService
   - 导出: CurrencyService (供其他模块使用)

4. 更新 `Currency` enum
   - 文件: `src/api-modules/assets/entities/balance/user-asset.entity.ts`
   - 更新为:
   ```typescript
   export enum Currency {
     USD = 'USD',
     AED = 'AED',
     INR = 'INR',
   }
   ```

5. 创建货币初始化数据种子
   - 文件: `src/common-modules/currency/seeds/currency.seed.ts`
   ```typescript
   export const CURRENCY_SEEDS: Partial<CurrencyRate>[] = [
     {
       currency: 'USD',
       rateToUSD: new Decimal(1.0),
       symbol: '$',
       name: 'US Dollar',
       decimals: 2,
       isActive: true,
       displayOrder: 1,
     },
     {
       currency: 'AED',
       rateToUSD: new Decimal(3.67),
       symbol: 'د.إ',
       name: 'UAE Dirham',
       decimals: 2,
       isActive: true,
       displayOrder: 2,
     },
     {
       currency: 'INR',
       rateToUSD: new Decimal(83.12),
       symbol: '₹',
       name: 'Indian Rupee',
       decimals: 2,
       isActive: true,
       displayOrder: 3,
     },
   ];
   ```

6. 创建数据库初始化服务
   - 文件: `src/common-modules/currency/services/currency-seed.service.ts`
   ```typescript
   @Injectable()
   export class CurrencySeedService implements OnModuleInit {
     constructor(
       @InjectRepository(CurrencyRate)
       private currencyRateRepository: Repository<CurrencyRate>,
     ) {}

     async onModuleInit() {
       await this.seedCurrencies();
     }

     private async seedCurrencies() {
       for (const seed of CURRENCY_SEEDS) {
         const exists = await this.currencyRateRepository.findOne({
           where: { currency: seed.currency },
         });

         if (!exists) {
           await this.currencyRateRepository.save(seed);
           console.log(`✓ Seeded currency: ${seed.currency}`);
         }
       }
     }
   }
   ```

7. 将 CurrencySeedService 注册到 CurrencyModule
   ```typescript
   @Module({
     imports: [TypeOrmModule.forFeature([CurrencyRate])],
     providers: [CurrencyService, CurrencySeedService],
     exports: [CurrencyService],
   })
   export class CurrencyModule {}
   ```

**验证标准**:
- ✅ `yoho_currency_rates` 表自动创建 (TypeORM sync)
- ✅ `yoho_user_settings` 表自动创建
- ✅ 初始货币数据成功插入 (USD, AED, INR)
- ✅ 外键关系正确建立 (UserSetting → User)
- ✅ CurrencyModule可被其他模块导入
- ✅ 应用启动时看到种子数据日志

---

### Phase 2: 核心服务层 (2-3小时)
**目标**: 实现汇率转换和用户设置服务

**步骤**:
1. 实现 `CurrencyService`
   - 文件: `src/common-modules/currency/services/currency.service.ts`
   - 依赖: CurrencyRate Repository, RedisService
   - 方法 (参考上面的完整代码):
     - `getActiveCurrencies()`: 查询所有启用的货币 + Redis缓存
     - `getAllCurrencies()`: 查询所有货币(包括未启用)
     - `getCurrency(code)`: 获取单个货币 + Redis缓存
     - `getRate(currency)`: 获取汇率
     - `convertFromUSD(amount, targetCurrency)`: USD → 目标货币
     - `convertToUSD(amount, fromCurrency)`: 目标货币 → USD
     - `createCurrency(data, createdBy)`: 创建新货币
     - `updateCurrency(code, data, updatedBy)`: 更新货币
     - `toggleCurrencyStatus(code, updatedBy)`: 切换启用状态
     - `deleteCurrency(code)`: 删除货币
     - `clearCache(code?)`: 清除Redis缓存
   - 缓存策略:
     - Key: `currency:{CODE}` 和 `currency:active:all`
     - TTL: 1小时 (3600秒)
     - 更新/删除时主动清除相关缓存

2. 实现 `UserSettingService`
   - 文件: `src/api-modules/user/services/user-setting.service.ts`
   - 依赖: UserSetting Repository, RedisService
   - 方法:
     ```typescript
     // 获取用户设置
     async get(userId: string, key: string, defaultValue?: string): Promise<string> {
       const cacheKey = `user:setting:${userId}:${key}`;
       const cached = await this.redisService.get(cacheKey);
       if (cached) return cached;

       const setting = await this.userSettingRepository.findOne({
         where: { userId, settingKey: key },
       });

       const value = setting?.settingValue || defaultValue || '';
       await this.redisService.set(cacheKey, value, 86400); // 24小时
       return value;
     }

     // 设置用户设置
     async set(userId: string, key: string, value: string): Promise<void> {
       await this.userSettingRepository.upsert(
         { userId, settingKey: key, settingValue: value },
         ['userId', 'settingKey'],
       );
       await this.redisService.set(`user:setting:${userId}:${key}`, value, 86400);
     }

     // 批量获取用户设置
     async getMultiple(userId: string, keys: string[]): Promise<Map<string, string>> {
       const result = new Map<string, string>();
       for (const key of keys) {
         const value = await this.get(userId, key);
         if (value) result.set(key, value);
       }
       return result;
     }

     // 批量获取多用户的某个设置
     async getBatch(userIds: string[], key: string): Promise<Map<string, string>> {
       const result = new Map<string, string>();
       for (const userId of userIds) {
         const value = await this.get(userId, key);
         if (value) result.set(userId, value);
       }
       return result;
     }

     // 删除设置
     async delete(userId: string, key: string): Promise<void> {
       await this.userSettingRepository.delete({ userId, settingKey: key });
       await this.redisService.del(`user:setting:${userId}:${key}`);
     }
     ```
   - 缓存策略:
     - Key: `user:setting:{userId}:{key}`
     - TTL: 24小时
     - 使用 upsert 处理 INSERT OR UPDATE

3. 实现 `UserPreferenceService`
   - 文件: `src/api-modules/user/services/user-preference.service.ts`
   - 依赖: UserSettingService
   - 方法:
     ```typescript
     // 获取用户货币偏好
     async getUserCurrency(userId: string): Promise<string> {
       return this.userSettingService.get(userId, 'currency', 'USD');
     }

     // 设置用户货币偏好
     async setUserCurrency(userId: string, currency: string): Promise<void> {
       await this.userSettingService.set(userId, 'currency', currency);
     }

     // 批量获取用户货币偏好
     async getUserCurrencies(userIds: string[]): Promise<Map<string, string>> {
       return this.userSettingService.getBatch(userIds, 'currency');
     }
     ```

4. 将服务注册到模块
   - 更新 `src/common-modules/currency/currency.module.ts`:
     ```typescript
     @Module({
       imports: [TypeOrmModule.forFeature([CurrencyRate])],
       providers: [CurrencyService, CurrencySeedService],
       exports: [CurrencyService],
     })
     export class CurrencyModule {}
     ```

   - 更新 `src/api-modules/user/user.module.ts`:
     ```typescript
     @Module({
       imports: [TypeOrmModule.forFeature([User, UserSetting])],
       providers: [UserService, UserSettingService, UserPreferenceService],
       exports: [UserService, UserSettingService, UserPreferenceService],
     })
     export class UserModule {}
     ```

5. 单元测试
   - 文件: `src/common-modules/currency/services/currency.service.spec.ts`
     - 测试汇率转换精度 (Decimal.js)
     - 测试缓存命中/未命中
     - 测试不存在货币的异常处理
     - 测试USD保护机制

   - 文件: `src/api-modules/user/services/user-setting.service.spec.ts`
     - 测试upsert逻辑
     - 测试缓存更新
     - 测试默认值返回

   - 文件: `src/api-modules/user/services/user-preference.service.spec.ts`
     - 测试默认返回USD
     - 测试批量查询

**验证标准**:
- ✅ 所有单元测试通过
- ✅ 汇率转换精度正确 (保留8位小数)
- ✅ Redis缓存正常工作 (命中率监控)
- ✅ 用户设置upsert正确 (不产生重复记录)
- ✅ 默认返回USD偏好
- ✅ USD不可禁用和删除

---

---

### Phase 3: Admin管理接口 (2-3小时)
**目标**: 实现管理员货币管理功能

**步骤**:
1. 创建 `AdminCurrencyController`
   - 文件: `src/api-modules/admin/controllers/admin-currency.controller.ts`
   - 路由前缀: `/api/v1/admin/currencies`
   - 守卫: `@UseGuards(AdminJwtGuard)`
   - 完整实现参考上面的代码

2. 实现CRUD接口
   - `GET /api/v1/admin/currencies`
     - 返回所有货币(包括未启用)
     - 按displayOrder排序
     - 无需分页(货币数量有限)

   - `GET /api/v1/admin/currencies/:code`
     - 获取单个货币详情
     - 用于编辑表单回显

   - `POST /api/v1/admin/currencies`
     - 创建新货币
     - 验证: currency code唯一性 (3位字母)
     - 验证: rateToUSD > 0, decimals 0-8
     - 记录createdBy (admin user ID)

   - `PUT /api/v1/admin/currencies/:code`
     - 更新货币完整信息
     - 支持部分更新 (只更新提供的字段)
     - 记录updatedBy和lastUpdatedAt
     - 清除Redis缓存

   - `PATCH /api/v1/admin/currencies/:code/status`
     - 切换isActive状态
     - USD不允许禁用 (返回400)

   - `DELETE /api/v1/admin/currencies/:code`
     - 删除货币
     - USD不允许删除 (返回400)
     - 返回204 No Content

3. 创建DTOs
   - 文件: `src/api-modules/admin/dto/currency.dto.ts`
   - DTOs: CreateCurrencyDto, UpdateCurrencyDto, CurrencyResponseDto
   - 验证规则:
     - `@Length(3, 3)`: 货币代码必须3位
     - `@Matches(/^\d+(\.\d{1,8})?$/)`: 汇率格式验证
     - `@Min(0) @Max(8)`: 小数位数限制
     - `@Transform(({ value }) => value.toUpperCase())`: 自动转大写

4. 集成到AdminModule
   - 更新: `src/api-modules/admin/admin.module.ts`
   - 导入: CurrencyModule
   - 注册: AdminCurrencyController
   ```typescript
   @Module({
     imports: [
       TypeOrmModule.forFeature([...]),
       CurrencyModule, // 新增
     ],
     controllers: [
       AdminAuthController,
       AdminProductController,
       // ...
       AdminCurrencyController, // 新增
     ],
     providers: [AdminAuthService, AdminProductService, ...],
   })
   export class AdminModule {}
   ```

5. 接口测试
   - 使用Postman创建测试集合
   - 测试场景:
     - ✓ 创建新货币 (CNY)
     - ✓ 更新汇率
     - ✓ 切换状态
     - ✓ 尝试禁用USD (应该失败)
     - ✓ 尝试删除USD (应该失败)
     - ✓ 删除非USD货币
     - ✓ 无admin token访问 (应该401)
     - ✓ 非法汇率格式 (应该400)

**验证标准**:
- ✅ 所有CRUD接口正常工作
- ✅ 权限验证生效(需要admin token)
- ✅ 数据验证规则生效
- ✅ 更新汇率后缓存被清除
- ✅ USD保护机制生效 (不可禁用/删除)
- ✅ 错误信息清晰明确

---

### Phase 4: 用户偏好接口 (1-2小时)
**目标**: 实现用户货币偏好管理

**步骤**:
1. 创建 `UserPreferenceController`
   - 文件: `src/api-modules/user/controllers/user-preference.controller.ts`
   - 路由前缀: `/api/v1/user/preferences`
   - 守卫: `@UseGuards(JwtAuthGuard)`

2. 实现偏好接口
   - `GET /api/v1/user/preferences/currency`
     - 返回: `{ currency: 'USD' }`
     - 使用 `@CurrentUser()` 装饰器获取用户

   - `PUT /api/v1/user/preferences/currency`
     - 请求体: `{ currency: 'AED' }`
     - 验证: currency必须是启用的货币
     - 更新数据库 + 清除缓存

   - `GET /api/v1/user/preferences/currencies/available`
     - 返回所有isActive=true的货币列表
     - 供前端下拉选择

3. 创建DTOs
   - 文件: `src/api-modules/user/dto/preference.dto.ts`
   - DTOs: SetCurrencyDto, CurrencyPreferenceResponseDto

4. 集成到UserModule
   - 更新: `src/api-modules/user/user.module.ts`
   - 添加: UserPreferenceController, UserPreferenceService

**验证标准**:
- ✅ 用户可以成功设置货币偏好
- ✅ 设置后立即生效(缓存更新)
- ✅ 只能选择启用的货币
- ✅ JWT认证正常工作

---

### Phase 5: 响应转换拦截器 (3-4小时)
**目标**: 实现API响应金额自动转换

**步骤**:
1. 创建 `CurrencyTransformInterceptor`
   - 文件: `src/common-modules/currency/interceptors/currency-transform.interceptor.ts`
   - 实现: `NestInterceptor` 接口

2. 实现转换逻辑
   ```typescript
   async intercept(context, next) {
     const request = context.switchToHttp().getRequest();
     const userId = request.user?.id;

     if (!userId) return next.handle(); // 未登录用户不转换

     const preferredCurrency = await this.preferenceService.getUserCurrency(userId);

     if (preferredCurrency === 'USD') {
       return next.handle(); // USD不需要转换
     }

     return next.handle().pipe(
       map(data => this.transformAmounts(data, preferredCurrency))
     );
   }
   ```

3. 实现递归金额转换
   ```typescript
   async transformAmounts(data: any, currency: string): Promise<any> {
     if (data === null || data === undefined) return data;

     // 识别金额字段的规则
     const amountFields = [
       'amount', 'balance', 'price', 'totalPrice',
       'salePrice', 'originalPrice', 'pricePerSpot',
       'prizeValue', 'balanceReal', 'balanceBonus',
       'balanceLocked', 'withdrawableBalance', 'availableBalance'
     ];

     if (Array.isArray(data)) {
       return Promise.all(data.map(item => this.transformAmounts(item, currency)));
     }

     if (typeof data === 'object') {
       const transformed = {};
       for (const [key, value] of Object.entries(data)) {
         if (amountFields.includes(key) && this.isNumeric(value)) {
           // 转换金额
           const usdAmount = new Decimal(value);
           const rate = await this.currencyService.getRate(currency);
           transformed[key] = usdAmount.times(rate).toFixed(2);
         } else if (typeof value === 'object') {
           transformed[key] = await this.transformAmounts(value, currency);
         } else {
           transformed[key] = value;
         }
       }

       // 附加货币信息
       if (amountFields.some(field => field in data)) {
         transformed['_currency'] = currency;
       }

       return transformed;
     }

     return data;
   }
   ```

4. 配置拦截器应用范围
   - 方案A: 全局拦截器 (推荐)
     ```typescript
     // src/app.module.ts
     providers: [
       {
         provide: APP_INTERCEPTOR,
         useClass: CurrencyTransformInterceptor,
       },
     ]
     ```

   - 方案B: 模块级拦截器
     ```typescript
     // 在AssetModule, EcommerceModule等需要转换的模块中单独应用
     @UseInterceptors(CurrencyTransformInterceptor)
     ```

5. 性能优化
   - 批量请求缓存: 单次请求只获取一次汇率
   - 条件转换: 检测响应是否包含金额字段再转换
   - 跳过内部API: `/api/v1/inner` 不应用拦截器

6. 测试
   - 单元测试: 测试递归转换逻辑
   - 集成测试: 测试真实API响应转换
   - 性能测试: 确保转换不影响响应时间

**验证标准**:
- ✅ 所有金额字段正确转换
- ✅ 嵌套对象和数组正确处理
- ✅ USD用户不触发转换(性能优化)
- ✅ 未登录用户不受影响
- ✅ 响应包含 `_currency` 字段标识

---

### Phase 6: Admin前端集成 (2-3小时)
**目标**: 在admin-browser中实现汇率管理界面

**步骤**:
1. 创建汇率管理页面
   - 文件: `admin-browser/src/pages/CurrencyRates.tsx`
   - 路由: `/admin/currencies`

2. 页面功能
   - 汇率列表表格
     - 列: 货币代码, 符号, 名称, 汇率, 状态, 最后更新时间, 更新人, 操作
     - 排序: 按displayOrder

   - 添加货币对话框
     - 表单: currency, rateToUSD, symbol, name, displayOrder
     - 验证: 必填项, 汇率>0

   - 编辑汇率对话框
     - 仅编辑rateToUSD字段
     - 显示当前汇率和最后更新时间

   - 启用/禁用开关
     - 直接在列表中切换
     - USD不可禁用

   - 删除确认
     - USD不可删除

3. API集成
   - 创建API客户端
     - 文件: `admin-browser/src/services/api/currency.ts`
     - 方法: getCurrencies, createCurrency, updateRate, toggleStatus, deleteCurrency

   - 使用React Query
     ```typescript
     const { data: currencies } = useQuery('currencies', getCurrencies);
     const updateMutation = useMutation(updateRate, {
       onSuccess: () => queryClient.invalidateQueries('currencies'),
     });
     ```

4. UI组件
   - 使用现有的UI框架(Tailwind + Headless UI)
   - 复用现有的Table, Modal, Button组件
   - 响应式设计

5. 权限验证
   - 确保admin JWT token正确传递
   - 处理401/403错误

**验证标准**:
- ✅ 页面正常加载显示汇率列表
- ✅ 可以添加新货币
- ✅ 可以更新汇率
- ✅ 可以启用/禁用货币
- ✅ USD的特殊保护生效
- ✅ 更新后前端数据实时刷新

---

### Phase 7: 前端用户偏好界面 (1-2小时)
**目标**: (如果有用户前端) 添加货币选择功能

**注意**: 当前项目只有admin-browser,没有用户前端。此阶段为未来预留。

**假设有用户前端的实现**:
1. 在用户设置页面添加货币选择器
2. 在顶部导航栏显示当前货币符号
3. 所有金额展示使用转换后的值
4. 提供货币切换快捷入口

**如果使用移动端或第三方前端**:
- 通过API `/api/v1/user/preferences/currency` 获取和设置
- 前端自行处理金额展示逻辑

---

### Phase 8: 测试与优化 (2-3小时)
**目标**: 确保功能稳定和性能优化

**步骤**:
1. 集成测试
   - 完整流程测试:
     1. Admin添加汇率 → 2. 用户设置偏好 → 3. 查询资产 → 4. 验证转换正确
   - 测试用例:
     - 用户A(USD) 和 用户B(AED) 查看同一商品价格
     - 用户切换货币后立即生效
     - Admin更新汇率后,用户查询反映最新汇率

2. 性能测试
   - 使用ab或k6测试:
     - 有转换 vs 无转换的响应时间差异
     - 缓存命中率
   - 目标: 转换开销 < 50ms

3. 边界情况测试
   - 不存在的货币代码
   - 汇率为0或负数
   - 并发更新汇率
   - Redis缓存失效
   - 用户未设置偏好(默认USD)

4. 数据一致性检查
   - 汇率更新后所有缓存清除
   - 用户偏好更新后立即生效
   - 禁用货币后用户偏好自动回退到USD

5. 监控和日志
   - 添加汇率更新日志
   - 监控转换错误率
   - 记录货币转换性能指标

6. 文档完善
   - API文档更新 (Swagger)
   - 管理员操作手册
   - 技术文档 (架构设计, 数据流)

**验证标准**:
- ✅ 所有集成测试通过
- ✅ 响应时间增加 < 50ms
- ✅ 缓存命中率 > 80%
- ✅ 边界情况正确处理
- ✅ 文档完整准确

---

## 四、依赖关系

```
Phase 1 (数据库层)
    ↓
Phase 2 (核心服务层)
    ↓
    ├─→ Phase 3 (Admin管理接口)
    │       ↓
    │   Phase 6 (Admin前端)
    │
    └─→ Phase 4 (用户偏好接口)
            ↓
        Phase 5 (响应转换拦截器)
            ↓
        Phase 7 (前端用户界面,可选)

Phase 8 (测试与优化) - 贯穿全程
```

**关键依赖**:
- Phase 3, 4, 5 都依赖 Phase 2
- Phase 6 依赖 Phase 3
- Phase 7 依赖 Phase 4 和 Phase 5
- Phase 8 在各阶段完成后进行

---

## 五、技术风险与缓解

### 5.1 高风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **汇率转换精度损失** | 财务错误 | 中 | 1. 使用Decimal.js全程计算<br>2. 保留8位小数精度<br>3. 前端展示时四舍五入到2位 |
| **性能问题** | 响应变慢 | 中 | 1. Redis缓存汇率和用户偏好<br>2. 批量请求优化<br>3. 条件转换(检测金额字段) |
| **并发更新汇率** | 数据不一致 | 低 | 1. 数据库行锁<br>2. 更新后清除所有相关缓存<br>3. 记录更新日志 |

### 5.2 中风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **拦截器影响现有API** | 兼容性问题 | 中 | 1. 先在单个模块测试<br>2. 添加开关控制拦截器<br>3. 充分测试现有接口 |
| **Redis缓存失效** | 性能下降 | 低 | 1. 降级到数据库查询<br>2. 监控缓存命中率<br>3. 设置合理TTL |
| **前端显示不一致** | 用户体验差 | 中 | 1. 响应中包含 `_currency` 字段<br>2. 前端统一处理金额展示<br>3. 提供货币符号 |

### 5.3 低风险
| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **用户频繁切换货币** | 缓存抖动 | 低 | 1. 限制切换频率<br>2. 缓存预热常用货币 |
| **Admin误删除USD** | 系统故障 | 极低 | 1. 硬编码USD保护<br>2. 删除前二次确认 |

---

## 六、数据迁移策略

### 6.1 新表创建
由于项目使用 `synchronize: true`,新表会自动创建,无需手动迁移脚本。

**自动创建的表**:
- `yoho_currency_rates` - 货币汇率表
- `yoho_user_settings` - 用户设置表

### 6.2 初始化数据
初始货币数据通过 `CurrencySeedService` 在应用启动时自动插入。

**种子数据**: 参考 `src/common-modules/currency/seeds/currency.seed.ts`
```typescript
export const CURRENCY_SEEDS: Partial<CurrencyRate>[] = [
  { currency: 'USD', rateToUSD: 1.0, symbol: '$', name: 'US Dollar', ... },
  { currency: 'AED', rateToUSD: 3.67, symbol: 'د.إ', name: 'UAE Dirham', ... },
  { currency: 'INR', rateToUSD: 83.12, symbol: '₹', name: 'Indian Rupee', ... },
];
```

**执行方式**:
- 自动执行: `CurrencySeedService.onModuleInit()` 在应用启动时检查并插入
- 日志输出: `✓ Seeded currency: USD`
- 幂等性: 使用 `findOne` 检查,避免重复插入

### 6.3 手动执行SQL (可选)
如果需要在生产环境手动插入数据:

```sql
INSERT INTO yoho_currency_rates
  (currency, "rateToUSD", symbol, name, decimals, "isActive", "displayOrder", "lastUpdatedAt", "createdAt")
VALUES
  ('USD', 1.0, '$', 'US Dollar', 2, true, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('AED', 3.67, 'د.إ', 'UAE Dirham', 2, true, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('INR', 83.12, '₹', 'Indian Rupee', 2, true, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (currency) DO NOTHING;
```

### 6.4 现有数据影响
**不需要迁移现有数据**,因为:
- 所有金额继续以USD存储在 `UserAsset`, `Product`, `Order` 等表
- `UserAsset.currency` 字段保持为 'USD'
- 仅在API响应时进行货币转换
- 用户设置为新增表,不影响现有用户数据
- 用户首次访问时默认使用USD,无需数据迁移

### 6.5 回滚策略
如果需要回滚功能:

```sql
-- 1. 删除用户设置数据
DELETE FROM yoho_user_settings WHERE "settingKey" = 'currency';

-- 2. 删除货币汇率表 (可选,保留USD)
DELETE FROM yoho_currency_rates WHERE currency != 'USD';

-- 3. 完全删除表 (谨慎操作)
DROP TABLE IF EXISTS yoho_user_settings;
DROP TABLE IF EXISTS yoho_currency_rates;
```

**注意**: 删除表会导致数据丢失,建议先备份。

---

## 七、部署检查清单

### 7.1 环境变量
确认以下环境变量配置正确:
```bash
# 数据库
DATABASE_URL=postgresql://...

# Redis (用于缓存)
REDIS_URL=redis://...

# 可选: 禁用汇率转换功能
ENABLE_CURRENCY_CONVERSION=true
```

### 7.2 数据库检查
- [ ] `yoho_currency_rates` 表已创建
- [ ] `yoho_user_currency_preferences` 表已创建
- [ ] 初始汇率数据已插入
- [ ] 外键关系正确

### 7.3 Redis检查
- [ ] Redis连接正常
- [ ] 缓存key格式: `currency:rate:{currency}` 和 `user:currency:{userId}`
- [ ] TTL设置正确

### 7.4 API检查
- [ ] Admin汇率管理接口正常 (需admin token)
- [ ] 用户偏好接口正常 (需user token)
- [ ] 拦截器正确应用
- [ ] Swagger文档已更新

### 7.5 前端检查
- [ ] Admin汇率管理页面可访问
- [ ] 汇率CRUD操作正常
- [ ] 权限验证正常

### 7.6 性能检查
- [ ] 响应时间增加 < 50ms
- [ ] 缓存命中率 > 80%
- [ ] 无内存泄漏

---

## 八、估时总结

| 阶段 | 工作内容 | 预估时间 | 复杂度 |
|------|----------|----------|--------|
| Phase 1 | 数据库层 (CurrencyRate + UserSetting) | 1-2小时 | 低 |
| Phase 2 | 核心服务层 (Currency + UserSetting + UserPreference) | 2-3小时 | 中 |
| Phase 3 | Admin管理接口 (货币CRUD) | 2-3小时 | 中 |
| Phase 4 | 用户偏好接口 (设置货币偏好) | 1-2小时 | 低 |
| Phase 5 | 响应转换拦截器 (自动金额转换) | 3-4小时 | 高 |
| Phase 6 | Admin前端集成 (汇率管理界面) | 2-3小时 | 中 |
| Phase 7 | 用户前端界面(可选) | 1-2小时 | 低 |
| Phase 8 | 测试与优化 (集成测试+性能优化) | 2-3小时 | 中 |
| **总计** | | **14-22小时** | **中高** |

**建议时间分配**:
- **第1天 (4-5小时)**: Phase 1 + Phase 2
  - 上午: 创建实体和模块
  - 下午: 实现服务层和单元测试

- **第2天 (5-6小时)**: Phase 3 + Phase 4
  - 上午: Admin管理接口
  - 下午: 用户偏好接口

- **第3天 (5-6小时)**: Phase 5 + Phase 6
  - 上午: 响应转换拦截器
  - 下午: Admin前端界面

- **第4天 (3-4小时)**: Phase 8 (测试优化)
  - 集成测试
  - 性能优化
  - 文档完善

**最小可行版本 (MVP)**: Phase 1-5 (9-14小时)
- 包含后端所有功能
- 可通过API直接操作
- 暂不包含前端界面

---

## 九、成功标准

### 9.1 功能完整性
- [x] 管理员可以添加/编辑/删除货币汇率
- [x] 用户可以设置和查询货币偏好
- [x] 所有金额字段正确转换显示
- [x] USD用户不受影响(性能优化)

### 9.2 数据正确性
- [x] 汇率转换精度正确 (Decimal.js)
- [x] USD仍为内部存储货币
- [x] 用户切换货币立即生效
- [x] 并发更新汇率不出错

### 9.3 性能要求
- [x] 响应时间增加 < 50ms
- [x] 缓存命中率 > 80%
- [x] Redis缓存正常工作

### 9.4 用户体验
- [x] Admin界面直观易用
- [x] 响应包含货币标识 (`_currency`)
- [x] 错误提示清晰

### 9.5 技术质量
- [x] 单元测试覆盖核心逻辑
- [x] 集成测试通过
- [x] 代码符合项目规范
- [x] API文档完整

---

## 十、后续优化方向

### 10.1 短期优化 (1-2周内)
1. **实时汇率集成**
   - 集成第三方汇率API (如CurrencyLayer, Fixer.io)
   - 定时任务自动更新汇率
   - 保留手动覆盖能力

2. **汇率历史记录**
   - 创建 `CurrencyRateHistory` 表
   - 记录每次汇率变更
   - 提供历史汇率查询

3. **前端优化**
   - 货币符号前置/后置配置
   - 本地化数字格式 (千分位, 小数点)
   - 货币切换动画

### 10.2 中期优化 (1-2月内)
1. **多货币资产支持**
   - 用户可以持有多币种余额
   - 跨币种交易
   - 自动汇率转换

2. **汇率提醒**
   - 用户设置目标汇率
   - 到达目标时通知

3. **数据分析**
   - 用户货币偏好分布
   - 不同地区货币使用统计
   - 汇率变化影响分析

### 10.3 长期优化 (3-6月内)
1. **加密货币支持**
   - 添加BTC, ETH, USDT等
   - 集成链上汇率

2. **智能汇率**
   - AI预测汇率趋势
   - 最佳兑换时机提醒

---

## 十一、参考资料

### 11.1 相关文档
- NestJS Interceptors: https://docs.nestjs.com/interceptors
- TypeORM Decimal: https://typeorm.io/entities#column-types-for-postgres
- Decimal.js: https://mikemcl.github.io/decimal.js/
- Redis Caching: https://docs.nestjs.com/techniques/caching

### 11.2 汇率参考
- **USD/AED**: ~3.67 (阿联酋迪拉姆,固定汇率)
- **USD/INR**: ~83.12 (印度卢比,浮动汇率)
- 数据来源: 2024年平均汇率

### 11.3 项目文件引用
- User Entity: `src/api-modules/user/entity/user.entity.ts`
- UserAsset Entity: `src/api-modules/assets/entities/balance/user-asset.entity.ts`
- Admin Module: `src/api-modules/admin/admin.module.ts`
- App Module: `src/app.module.ts`

---

## 附录A: API接口清单

### Admin APIs (货币管理)
```
GET    /api/v1/admin/currencies           - 获取所有货币(包括未启用)
GET    /api/v1/admin/currencies/:code     - 获取单个货币详情
POST   /api/v1/admin/currencies           - 添加新货币
PUT    /api/v1/admin/currencies/:code     - 更新货币(汇率、名称等)
PATCH  /api/v1/admin/currencies/:code/status - 切换启用/禁用状态
DELETE /api/v1/admin/currencies/:code     - 删除货币

认证: 需要 AdminJwtGuard (Google OAuth + JWT)
权限: Admin角色
```

### User APIs (用户设置)
```
GET /api/v1/user/settings/:key                     - 获取单个设置
PUT /api/v1/user/settings/:key                     - 设置单个设置
GET /api/v1/user/settings                          - 获取所有设置

认证: 需要 JwtAuthGuard
权限: 登录用户
```

### User APIs (货币偏好)
```
GET /api/v1/user/preferences/currency               - 获取用户货币偏好
PUT /api/v1/user/preferences/currency               - 设置货币偏好
GET /api/v1/user/preferences/currencies/available   - 获取可用货币列表

认证: 需要 JwtAuthGuard
权限: 登录用户
```

### 响应示例

#### GET /api/v1/admin/currencies
```json
[
  {
    "currency": "USD",
    "rateToUSD": "1.00000000",
    "symbol": "$",
    "name": "US Dollar",
    "decimals": 2,
    "isActive": true,
    "displayOrder": 1,
    "lastUpdatedAt": "2026-01-29T10:00:00Z",
    "updatedBy": "admin123",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  {
    "currency": "AED",
    "rateToUSD": "3.67000000",
    "symbol": "د.إ",
    "name": "UAE Dirham",
    "decimals": 2,
    "isActive": true,
    "displayOrder": 2,
    "lastUpdatedAt": "2026-01-29T10:00:00Z",
    "updatedBy": "admin123",
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

#### GET /api/v1/user/preferences/currency
```json
{
  "currency": "AED"
}
```

#### GET /api/v1/user/preferences/currencies/available
```json
[
  {
    "currency": "USD",
    "symbol": "$",
    "name": "US Dollar",
    "decimals": 2,
    "displayOrder": 1
  },
  {
    "currency": "AED",
    "symbol": "د.إ",
    "name": "UAE Dirham",
    "decimals": 2,
    "displayOrder": 2
  },
  {
    "currency": "INR",
    "symbol": "₹",
    "name": "Indian Rupee",
    "decimals": 2,
    "displayOrder": 3
  }
]
```

#### 转换后的金额响应示例
```json
{
  "balance": "183.50",
  "salePrice": "91.75",
  "_currency": "AED"
}
```
原始USD值: balance=50, salePrice=25
汇率: 1 USD = 3.67 AED
转换后: 50 * 3.67 = 183.50

---

## 附录B: 数据库Schema

### yoho_currency_rates
```sql
CREATE TABLE yoho_currency_rates (
  currency VARCHAR(3) PRIMARY KEY,
  "rateToUSD" DECIMAL(18,8) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  name VARCHAR(100) NOT NULL,
  decimals INT DEFAULT 2,
  "isActive" BOOLEAN DEFAULT true,
  "displayOrder" INT DEFAULT 0,
  "lastUpdatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedBy" VARCHAR,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_currency_rates_display_order ON yoho_currency_rates("displayOrder");
CREATE INDEX idx_currency_rates_active ON yoho_currency_rates("isActive");

-- 插入初始数据
INSERT INTO yoho_currency_rates (currency, "rateToUSD", symbol, name, decimals, "isActive", "displayOrder") VALUES
('USD', 1.0, '$', 'US Dollar', 2, true, 1),
('AED', 3.67, 'د.إ', 'UAE Dirham', 2, true, 2),
('INR', 83.12, '₹', 'Indian Rupee', 2, true, 3)
ON CONFLICT (currency) DO NOTHING;
```

### yoho_user_settings
```sql
CREATE TABLE yoho_user_settings (
  "userId" VARCHAR NOT NULL,
  "settingKey" VARCHAR NOT NULL,
  "settingValue" TEXT NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("userId", "settingKey"),
  FOREIGN KEY ("userId") REFERENCES yoho_user(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX idx_user_settings_user_id ON yoho_user_settings("userId");

-- 示例数据
-- INSERT INTO yoho_user_settings ("userId", "settingKey", "settingValue") VALUES
-- ('user123', 'currency', 'AED'),
-- ('user456', 'currency', 'INR');
```

### 表关系图
```
yoho_user (用户表)
    ↓ (1:N)
yoho_user_settings (用户设置表)
    - userId + settingKey: 复合主键
    - settingKey = 'currency' → 货币偏好
    - settingKey = 'language' → 语言偏好 (未来扩展)
    - settingKey = 'theme' → 主题偏好 (未来扩展)

yoho_currency_rates (货币汇率表)
    - currency: 主键
    - 独立表,与用户无直接关联
    - 用户设置中的 settingValue 引用 currency.currency
```

---

**计划创建时间**: 2026-01-29
**预计开始时间**: 待用户确认
**预计完成时间**: 确认后 2-3 个工作日

---

**等待用户确认**:
- ✅ 是否同意此实现计划?
- ✅ 是否需要调整任何阶段?
- ✅ 是否有额外需求?
- ✅ 是否现在开始实施?