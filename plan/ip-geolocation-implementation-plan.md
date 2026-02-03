# IP 地理定位 API 实现计划

## 概述

实现一个**三层混合 IP 地理定位系统**：
1. **Redis 缓存层**（最快，< 1ms）
2. **离线数据库层**（geoip-lite，< 5ms，无 API 调用）
3. **在线 API 层**（ip-api.com 主 + ipapi.co 备，100-500ms）

## 技术方案

### 数据流

```
请求 → Redis 缓存（24h TTL）
         ↓ (miss)
      离线数据库 (geoip-lite)
         ↓ (无结果或低置信度)
      在线 API (ip-api.com → ipapi.co)
         ↓
      返回结果 + 存入缓存
```

### 核心技术选择

- **离线数据库**: `geoip-lite` - 基于 MaxMind GeoLite2，月度更新，零配置
- **主在线 API**: ip-api.com - 免费，45请求/分钟，无需 API key
- **备用 API**: ipapi.co - 免费 1000请求/天，用于主 API 失败时
- **缓存**: Redis，24小时 TTL
- **认证**: JWT 认证（JwtAuthGuard）

### 模块组织

```
src/
├── common-modules/geolocation/          # 可复用核心服务
│   ├── geolocation.module.ts
│   ├── geolocation.service.ts           # 主编排逻辑
│   ├── providers/
│   │   ├── offline.provider.ts          # geoip-lite 封装
│   │   └── online.provider.ts           # HTTP API 调用
│   ├── dto/geolocation.dto.ts
│   ├── interfaces/geolocation.interface.ts
│   └── utils/
│       ├── ip-extractor.util.ts         # 提取真实 IP（处理代理）
│       └── ip-validator.util.ts         # 验证 IP 有效性
│
└── api-modules/geolocation/             # REST API 层
    ├── geolocation.module.ts
    └── controllers/geolocation.controller.ts
```

## 实现步骤

### 1. 安装依赖

```bash
npm install geoip-lite --legacy-peer-deps
```

### 2. 创建工具类（基础设施）

**文件**: `src/common-modules/geolocation/utils/ip-validator.util.ts`
- 验证 IP 格式（使用 Node.js `net.isIP()`）
- 检测私有 IP（127.x.x.x, 10.x.x.x, 192.168.x.x, ::1 等）
- 规范化 IPv6（::ffff:192.0.2.1 → 192.0.2.1）

**文件**: `src/common-modules/geolocation/utils/ip-extractor.util.ts`
- 从 Express Request 提取真实 IP
- 优先级：X-Forwarded-For → X-Real-IP → CF-Connecting-IP → req.ip
- 处理代理/负载均衡器场景

### 3. 创建数据接口和 DTO

**文件**: `src/common-modules/geolocation/interfaces/geolocation.interface.ts`
```typescript
export interface GeolocationData {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  source: 'cache' | 'offline' | 'online-primary' | 'online-fallback';
  confidence: 'high' | 'medium' | 'low';
  timestamp: number;
}
```

**文件**: `src/common-modules/geolocation/dto/geolocation.dto.ts`
- 使用 `@ApiProperty` 装饰器（Swagger 文档）
- 使用 class-validator 装饰器
- 与 GeolocationData 接口匹配

### 4. 实现离线数据提供者

**文件**: `src/common-modules/geolocation/providers/offline.provider.ts`
- 注入 `@Injectable()` 服务
- 使用 `geoip-lite` 的 `lookup(ip)` 方法
- 转换 geoip-lite 格式到标准 GeolocationData 格式
- 计算置信度：有城市+地区+坐标 = high，有城市 = medium，否则 = low

### 5. 实现在线 API 提供者

**文件**: `src/common-modules/geolocation/providers/online.provider.ts`
- 注入 RedisService（用于速率限制）
- **主 API**: `http://ip-api.com/json/{ip}` - 返回 JSON
- **备用 API**: `https://ipapi.co/{ip}/json/` - 主 API 失败时使用
- **速率限制**: 使用 Redis 计数器，key = `geolocation:api:calls:minute`，限制 40 次/分钟（留 5 个 buffer）
- **超时设置**: 5 秒
- **错误处理**: 网络失败、API 错误时降级到备用 API

### 6. 实现主地理定位服务

**文件**: `src/common-modules/geolocation/geolocation.service.ts`
- 注入 RedisService, OfflineProvider, OnlineProvider
- **主方法**: `getLocation(ip: string): Promise<GeolocationData>`
  1. 规范化和验证 IP
  2. 检查 Redis 缓存（key: `geolocation:ip:{ip}`）
  3. 缓存未命中 → 查询离线数据库
  4. 如果离线结果可接受（high/medium confidence）→ 缓存并返回
  5. 否则调用在线 API
  6. 缓存结果（24 小时 TTL）
- **辅助方法**: `getLocationFromRequest(req: Request)` - 自动提取 IP
- **私有 IP 处理**: 抛出 BadRequestException

### 7. 创建 Common Module

**文件**: `src/common-modules/geolocation/geolocation.module.ts`
- 导入 ConfigModule, RedisModule
- 提供 GeolocationService, OfflineProvider, OnlineProvider
- 导出 GeolocationService（供其他模块使用）

### 8. 创建 REST API Controller

**文件**: `src/api-modules/geolocation/controllers/geolocation.controller.ts`
- 路径前缀: `/api/v1/geolocation`
- 使用 `@UseGuards(JwtAuthGuard)` 保护所有端点
- **端点 1**: `GET /ip` - 自动检测请求 IP 并返回位置
- **端点 2**: `GET /lookup?ip=xxx` - 查询指定 IP 的位置
- Swagger 文档（@ApiTags, @ApiOperation, @ApiResponse）

### 9. 创建 API Module

**文件**: `src/api-modules/geolocation/geolocation.module.ts`
- 导入 Common GeolocationModule
- 注册 GeolocationController

### 10. 集成到主应用

**修改**: `src/app.module.ts`
- 添加 `GeolocationApiModule` 到 imports 数组

## API 端点设计

### 端点 1: 获取当前请求 IP 位置

```
GET /api/v1/geolocation/ip
Authorization: Bearer <jwt-token>
```

响应示例：
```json
{
  "ip": "8.8.8.8",
  "country": "United States",
  "countryCode": "US",
  "city": "Mountain View",
  "region": "California",
  "latitude": 37.386,
  "longitude": -122.0838,
  "timezone": "America/Los_Angeles",
  "source": "offline",
  "confidence": "high",
  "timestamp": 1706897654321
}
```

### 端点 2: 查询指定 IP

```
GET /api/v1/geolocation/lookup?ip=1.1.1.1
Authorization: Bearer <jwt-token>
```

## 关键文件清单

### 需要创建的文件（10个）

1. `src/common-modules/geolocation/utils/ip-validator.util.ts`
2. `src/common-modules/geolocation/utils/ip-extractor.util.ts`
3. `src/common-modules/geolocation/interfaces/geolocation.interface.ts`
4. `src/common-modules/geolocation/dto/geolocation.dto.ts`
5. `src/common-modules/geolocation/providers/offline.provider.ts`
6. `src/common-modules/geolocation/providers/online.provider.ts`
7. `src/common-modules/geolocation/geolocation.service.ts` ⭐ 核心
8. `src/common-modules/geolocation/geolocation.module.ts`
9. `src/api-modules/geolocation/controllers/geolocation.controller.ts`
10. `src/api-modules/geolocation/geolocation.module.ts`

### 需要修改的文件（1个）

1. `src/app.module.ts` - 添加 GeolocationApiModule

## 配置

无需环境变量（全部使用默认值）：
- 缓存 TTL: 24 小时（86400 秒）
- API 速率限制: 40 次/分钟
- API 超时: 5 秒

如需自定义，可添加到 `.env`:
```bash
GEOLOCATION_CACHE_TTL=86400
GEOLOCATION_ONLINE_API_LIMIT=40
```

## 性能预期

| 层级 | 延迟 | 成功率 | API 调用 |
|------|------|--------|----------|
| Redis 缓存 | < 1ms | ~95% (预热后) | 0 |
| 离线数据库 | < 5ms | ~90% | 0 |
| 在线 API | 100-500ms | ~95% | < 1000/天 |

## 验证测试

### 1. 启动服务

```bash
npm install
npm run start:dev
```

### 2. 获取 JWT Token

使用现有的登录端点获取 token。

### 3. 测试端点

```bash
# 测试自动检测 IP
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3001/api/v1/geolocation/ip

# 测试指定 IP 查询
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/v1/geolocation/lookup?ip=8.8.8.8"

# 测试缓存（第二次调用应该更快，source = 'cache'）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/v1/geolocation/lookup?ip=8.8.8.8"
```

### 4. 验证数据来源

观察响应中的 `source` 字段：
- `cache` - 来自 Redis 缓存
- `offline` - 来自 geoip-lite
- `online-primary` - 来自 ip-api.com
- `online-fallback` - 来自 ipapi.co

### 5. 检查 Redis 缓存

```bash
# 连接 Redis 查看缓存 key
redis-cli
> KEYS geolocation:ip:*
> GET geolocation:ip:8.8.8.8
> TTL geolocation:ip:8.8.8.8
```

### 6. 测试错误场景

```bash
# 测试无效 IP（应返回 400）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/v1/geolocation/lookup?ip=999.999.999.999"

# 测试私有 IP（应返回 400）
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3001/api/v1/geolocation/lookup?ip=192.168.1.1"

# 测试未授权（应返回 401）
curl "http://localhost:3001/api/v1/geolocation/ip"
```

## 架构优势

1. **高性能**: 95%+ 请求命中缓存，< 1ms 响应
2. **高可用**: 三层降级，单点失败不影响服务
3. **低成本**: 离线优先，极少调用付费 API
4. **易扩展**: 模块化设计，可复用 GeolocationService
5. **生产就绪**: 错误处理、速率限制、日志记录完整

## 后续增强（可选）

- 添加监控指标（缓存命中率、API 调用量）
- 支持批量查询（一次查询多个 IP）
- VPN/代理检测集成
- 添加管理员端点（清除缓存）

## 实现状态

- [x] 步骤 1: 安装依赖 ✅
- [x] 步骤 2: 创建工具类 ✅
- [x] 步骤 3: 创建数据接口和 DTO ✅
- [x] 步骤 4: 实现离线数据提供者 ✅
- [x] 步骤 5: 实现在线 API 提供者 ✅
- [x] 步骤 6: 实现主地理定位服务 ✅
- [x] 步骤 7: 创建 Common Module ✅
- [x] 步骤 8: 创建 REST API Controller ✅
- [x] 步骤 9: 创建 API Module ✅
- [x] 步骤 10: 集成到主应用 ✅
- [ ] 测试验证

## 实现完成

所有代码文件已创建并成功编译！

### 已创建文件列表

1. ✅ `src/common-modules/geolocation/utils/ip-validator.util.ts` - IP 验证工具
2. ✅ `src/common-modules/geolocation/utils/ip-extractor.util.ts` - IP 提取工具
3. ✅ `src/common-modules/geolocation/interfaces/geolocation.interface.ts` - 数据接口定义
4. ✅ `src/common-modules/geolocation/dto/geolocation.dto.ts` - DTO 定义
5. ✅ `src/common-modules/geolocation/providers/offline.provider.ts` - 离线数据提供者
6. ✅ `src/common-modules/geolocation/providers/online.provider.ts` - 在线 API 提供者
7. ✅ `src/common-modules/geolocation/geolocation.service.ts` - 核心服务
8. ✅ `src/common-modules/geolocation/geolocation.module.ts` - Common Module
9. ✅ `src/api-modules/geolocation/controllers/geolocation.controller.ts` - API 控制器
10. ✅ `src/api-modules/geolocation/geolocation.module.ts` - API Module

### 已修改文件

1. ✅ `src/app.module.ts` - 添加 GeolocationApiModule
2. ✅ `package.json` - 添加 geoip-lite 依赖

### 下一步：测试验证

现在可以启动服务并测试 API 端点了：

```bash
npm run start:dev
```

然后按照"验证测试"部分的步骤进行测试。
