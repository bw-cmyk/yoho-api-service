# API 队列系统实现总结

## 概述

为了解决API限流问题，我们实现了一个完整的队列系统，包含两个版本：

1. **内存队列系统**：适用于单服务实例
2. **Redis分布式队列系统**：适用于多服务实例，解决并发问题

## 系统架构

### 文件结构

```
src/common-modules/
├── queue/
│   ├── queue.module.ts              # 队列模块
│   ├── queue.service.ts             # 内存队列服务
│   ├── queue.controller.ts          # 队列控制器
│   ├── queue-helper.service.ts      # 内存队列助手
│   ├── queue.example.ts             # 内存队列示例
│   ├── redis-queue-simple.service.ts    # Redis队列服务
│   ├── redis-queue-helper.service.ts    # Redis队列助手
│   ├── redis-queue.example.ts           # Redis队列示例
│   └── README-REDIS.md              # Redis队列文档
└── redis/
    ├── redis.module.ts              # Redis模块
    └── redis.service.ts             # Redis服务
```

## 功能特性对比

| 特性 | 内存队列 | Redis队列 |
|------|----------|-----------|
| 适用场景 | 单服务实例 | 多服务实例 |
| 并发处理 | ❌ | ✅ |
| API路径去重 | ❌ | ✅ |
| 分布式锁 | ❌ | ✅ |
| 持久化 | ❌ | ✅ |
| 实例隔离 | ❌ | ✅ |
| 自动重试 | ✅ | ✅ |
| 优先级队列 | ✅ | ✅ |
| 定时处理 | ✅ | ✅ |

## 核心功能

### 1. 内存队列系统

**适用场景**：单服务实例的API限流

**主要功能**：
- 请求队列管理
- 优先级处理
- 自动重试机制
- 回调处理
- 定时处理（每秒）

**使用方式**：
```typescript
// 注入服务
constructor(private readonly queueHelper: QueueHelperService) {}

// 添加请求
const requestId = await this.queueHelper.addApiRequest(
  () => axios.get('https://api.example.com/data'),
  (result) => console.log('成功:', result),
  (error) => console.error('失败:', error),
  1 // 优先级
);
```

### 2. Redis分布式队列系统

**适用场景**：多服务实例的API限流和并发控制

**主要功能**：
- 分布式队列管理
- API路径去重
- 分布式锁机制
- 结果缓存
- 实例隔离
- 自动重试

**使用方式**：
```typescript
// 注入服务
constructor(private readonly redisQueueHelper: RedisQueueHelperService) {}

// 添加GET请求
const requestId = await this.redisQueueHelper.addGetRequest(
  '/api/users/123', // API路径（用于去重）
  'https://api.example.com/users/123', // 实际URL
  { 'Authorization': 'Bearer token' }, // 请求头
  1 // 优先级
);

// 等待结果
const result = await this.redisQueueHelper.waitForResult(requestId);
```

## 技术实现

### 1. 内存队列实现

- **队列存储**：使用数组存储请求
- **定时处理**：使用 `@Cron` 装饰器每秒处理队列
- **优先级**：按优先级插入队列
- **重试机制**：失败请求自动重试，最多3次

### 2. Redis队列实现

- **队列存储**：使用Redis列表存储请求
- **分布式锁**：使用Redis SET命令实现
- **API路径去重**：基于API路径的哈希值生成锁键
- **结果缓存**：使用Redis哈希表存储结果
- **实例隔离**：每个实例有唯一标识

### 3. 关键算法

**API路径哈希算法**：
```typescript
private hashApiPath(apiPath: string): string {
  let hash = 0;
  for (let i = 0; i < apiPath.length; i++) {
    const char = apiPath.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(36);
}
```

**分布式锁实现**：
```typescript
async acquireLock(lockKey: string, ttl: number = 30): Promise<boolean> {
  const result = await this.redis.set(lockKey, '1', 'EX', ttl, 'NX');
  return result === 'OK';
}
```

## 配置和部署

### 1. 环境变量

```env
# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0

# 队列配置
QUEUE_MAX_CONCURRENT=1
QUEUE_MAX_RETRIES=3
QUEUE_RETRY_DELAY=2000
QUEUE_LOCK_TIMEOUT=30
```

### 2. 模块导入

```typescript
// app.module.ts
import { QueueModule } from './common-modules/queue/queue.module';

@Module({
  imports: [
    // ... 其他模块
    QueueModule,
  ],
})
export class AppModule {}
```

## 监控和管理

### 1. API接口

- `GET /queue/status` - 获取队列状态
- `GET /queue/items` - 获取队列项目
- `DELETE /queue/clear` - 清空队列
- `DELETE /queue/:id` - 移除特定请求
- `POST /queue/config` - 更新配置

### 2. 日志监控

系统会输出详细的日志信息：
- 请求添加到队列
- 请求处理开始/完成
- 重试操作
- 错误信息
- 分布式锁状态

## 性能优化

### 1. 内存队列优化

- 限制队列长度
- 定期清理过期请求
- 优化优先级排序算法

### 2. Redis队列优化

- 使用Redis管道操作
- 合理设置锁超时时间
- 定期清理过期结果
- 监控Redis内存使用

## 故障处理

### 1. 常见问题

- **Redis连接失败**：检查Redis服务状态和连接配置
- **锁无法释放**：手动清理Redis锁键
- **队列积压**：增加处理并发数或优化API响应时间
- **内存溢出**：监控队列长度和Redis内存使用

### 2. 故障恢复

```bash
# 清理Redis队列数据
redis-cli DEL api_queue:requests api_queue:results api_queue:lock
redis-cli KEYS "api_lock:*" | xargs redis-cli DEL
redis-cli KEYS "retry_count:*" | xargs redis-cli DEL
```

## 最佳实践

### 1. 选择队列类型

- **单实例部署**：使用内存队列
- **多实例部署**：使用Redis队列
- **高可用要求**：使用Redis队列

### 2. 配置建议

- 根据API响应时间调整锁超时时间
- 根据业务需求设置合适的重试次数
- 监控队列长度，避免积压
- 定期清理过期数据

### 3. 错误处理

- 实现适当的错误处理逻辑
- 记录详细的错误日志
- 设置合理的超时时间
- 实现降级策略

## 总结

这个队列系统提供了完整的API限流解决方案，能够有效处理单实例和多实例场景下的API请求管理。通过Redis分布式队列，解决了多服务实例并发请求同一API路径的问题，确保系统稳定性和数据一致性。

系统具有良好的扩展性和可维护性，可以根据实际需求进行定制和优化。 